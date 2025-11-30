const { parseLocationUrl, validateCoordinates } = require('./locationParser');
const { reverseGeocode } = require('./geocoder');
const { upsertSupplier, searchSuppliersByLocation, getAllProvinces, getDistrictsByProvince, getCitiesByDistrict, searchSuppliersByManualLocation } = require('./supplierManager');
const { searchOfficersByLocation, searchOfficersByManualLocation } = require('./officerManager');
const { log } = require('./logger');
const responses = require('./responses');
const { STATES, getSession, updateState, updateData, clearSession } = require('./sessionManager');

/**
 * Main message handler with State Machine
 */
async function handleMessage(message, client) {
  try {
    const userPhone = message.from;
    const msgBody = message.body.trim();
    const session = getSession(userPhone);

    console.log(`User: ${userPhone}, State: ${session.state}, Msg: ${msgBody}`);

    // --- GLOBAL RESET ---
    if (msgBody.toLowerCase() === 'reset' || msgBody.toLowerCase() === 'hi') {
      clearSession(userPhone);
      await message.reply(responses.welcome());
      updateState(userPhone, STATES.WAITING_FOR_ROLE);
      return;
    }

    // --- STATE MACHINE ---
    switch (session.state) {
      
      case STATES.INITIAL:
        await message.reply(responses.welcome());
        updateState(userPhone, STATES.WAITING_FOR_ROLE);
        break;

      case STATES.WAITING_FOR_ROLE:
        // Prepare image media
        const { MessageMedia } = require('whatsapp-web.js');
        const path = require('path');
        let media;
        try {
          media = MessageMedia.fromFilePath(path.join(__dirname, '../docs/location-instruction.jpg'));
        } catch (err) {
          console.error('Error loading image:', err);
        }

        if (msgBody === '1') {
          // Supplier Flow
          if (media) {
            await client.sendMessage(userPhone, media, { caption: responses.askAreas() });
          } else {
            await message.reply(responses.askAreas());
          }
          updateState(userPhone, STATES.SUPPLIER_WAITING_AREAS);
        } else if (msgBody === '2') {
          // Requester Flow
          if (media) {
            await client.sendMessage(userPhone, media, { caption: responses.askLocation() });
          } else {
            await message.reply(responses.askLocation());
          }
          updateState(userPhone, STATES.REQUESTER_WAITING_LOCATION);
        } else {
          await message.reply(responses.invalidInput());
        }
        break;

      // --- SUPPLIER FLOW ---
      case STATES.SUPPLIER_WAITING_AREAS:
        let sLat, sLng;

        // Check for native location message
        if (message.type === 'location') {
          sLat = message.location.latitude;
          sLng = message.location.longitude;
        } 
        // Fallback: Check for URL in text
        else {
          const locationMatch = msgBody.match(/(https?:\/\/[^\s]+)/);
          if (locationMatch) {
             const coords = parseLocationUrl(locationMatch[1]);
             if (coords) {
               sLat = coords.lat;
               sLng = coords.lng;
             }
          }
        }

        if (!sLat || !sLng) {
          await message.reply(responses.invalidLocation());
          return;
        }

        // Geocode to get full location details
        const sChat = await message.getChat();
        await sChat.sendStateTyping();
        
        try {
          const location = await reverseGeocode(sLat, sLng);
          
          // Validate location data
          if (!location || location.city === 'Unknown City') {
            await message.reply('කණගාටුයි, ඔබගේ ස්ථානය හඳුනාගත නොහැකි විය. කරුණාකර නැවත උත්සාහ කරන්න.');
            return;
          }
          
          // Save full location object
          updateData(userPhone, { location });
          
          await message.reply(responses.askSupplyTypes());
          updateState(userPhone, STATES.SUPPLIER_WAITING_TYPES);
        } catch (error) {
          console.error(error);
          await message.reply(responses.error());
        }
        break;

      case STATES.SUPPLIER_WAITING_TYPES:
        // Parse input - accept item numbers (e.g., "1,2,3,4" or "1,3,5")
        const inputValues = msgBody.split(',').map(s => s.trim());
        
        // Validate each value is a number between 1-5
        const itemNumbers = inputValues.map(v => parseInt(v)).filter(n => !isNaN(n));
        
        // Check if all values are valid item numbers (1-5)
        const allValid = itemNumbers.every(n => n >= 1 && n <= 5);
        
        if (itemNumbers.length === 0 || !allValid) {
          await message.reply('කරුණාකර 1-5 අතර අංක යොමු කරන්න.\nඋදාහරණ: 1,2,3 හෝ 1,4,5');
          return;
        }
        
        // Convert item numbers to boolean array
        // Item 1 = supplies[0], Item 2 = supplies[1], etc.
        const supplies = [
          itemNumbers.includes(1), // Dry food
          itemNumbers.includes(2), // Water
          itemNumbers.includes(3), // Medicine
          itemNumbers.includes(4), // Clothes
          itemNumbers.includes(5)  // Sanitary
        ];

        // Save Supplier
        const supplierData = {
          phone: userPhone,
          location: session.data.location,
          supplies: supplies
        };

        await upsertSupplier(supplierData);
        await message.reply(responses.supplierSuccess());
        
        await log({ user: userPhone, action: 'SUPPLIER_REGISTERED', details: supplierData });
        
        // Reset session
        clearSession(userPhone);
        break;

      // --- REQUESTER FLOW ---
      case STATES.REQUESTER_WAITING_LOCATION:
        let lat, lng;

        // Check for native location message
        if (message.type === 'location') {
          lat = message.location.latitude;
          lng = message.location.longitude;
        } 
        // Fallback: Check for URL in text
        else {
          const locationMatch = msgBody.match(/(https?:\/\/[^\s]+)/);
          if (locationMatch) {
             const coords = parseLocationUrl(locationMatch[1]);
             if (coords) {
               lat = coords.lat;
               lng = coords.lng;
             }
          }
        }

        // Check if user explicitly requested manual selection with "0"
        if (msgBody === '0' || !lat || !lng) {
          // User sent "0" or text instead of location - offer manual selection
          const provinces = await getAllProvinces();
          
          if (provinces.length === 0) {
            await message.reply('කණගාටුයි, දැනට කිසිදු සැපයුම්කරුවෙකු ලියාපදිංචි වී නොමැත.');
            clearSession(userPhone);
            return;
          }
          
          await message.reply(responses.selectProvince(provinces));
          updateData(userPhone, { provinces });
          updateState(userPhone, STATES.REQUESTER_SELECTING_PROVINCE);
          return;
        }

        // Has location data - proceed with geocoding
        const chat = await message.getChat();
        await chat.sendStateTyping();
        
        try {
          const location = await reverseGeocode(lat, lng);
          
          // Validate location data
          if (!location || location.city === 'Unknown City') {
            await message.reply('කණගාටුයි, ඔබගේ ස්ථානය හඳුනාගත නොහැකි විය. කරුණාකර නැවත උත්සාහ කරන්න.');
            clearSession(userPhone);
            return;
          }
          
          // Show typing before search
          await chat.sendStateTyping();
          
          // Search BOTH databases
          const supplierResult = await searchSuppliersByLocation(location);
          const officerResult = await searchOfficersByLocation(location);
          
          const totalResults = supplierResult.suppliers.length + officerResult.officers.length;
          
          if (totalResults > 0) {
            // Use the best match level (city > district > province > all)
            const matchLevel = supplierResult.matchLevel === 'city' || officerResult.matchLevel === 'city' ? 'city' :
                               supplierResult.matchLevel === 'district' || officerResult.matchLevel === 'district' ? 'district' :
                               supplierResult.matchLevel === 'province' || officerResult.matchLevel === 'province' ? 'province' : 'all';
            
            await message.reply(responses.suppliersFound(location, supplierResult.suppliers, officerResult.officers, matchLevel));
            await log({ 
              user: userPhone, 
              action: 'REQUESTER_SEARCH', 
              details: { 
                location, 
                matchLevel, 
                suppliers: supplierResult.suppliers.length,
                officers: officerResult.officers.length
              } 
            });
          } else {
            await message.reply('කණගාටුයි, දැනට කිසිදු සැපයුම්කරුවෙකු ලියාපදිංචි වී නොමැත.');
          }
          
          clearSession(userPhone);
          
        } catch (error) {
          console.error(error);
          await message.reply(responses.error());
          clearSession(userPhone);
        }
        break;

      case STATES.REQUESTER_SELECTING_PROVINCE:
        const provinceNum = parseInt(msgBody.trim());
        const provinces = session.data.provinces || [];
        
        if (isNaN(provinceNum) || provinceNum < 1 || provinceNum > provinces.length) {
          await message.reply('කරුණාකර නිවැරදි අංකයක් යොමු කරන්න.');
          return;
        }
        
        const selectedProvince = provinces[provinceNum - 1];
        const districts = await getDistrictsByProvince(selectedProvince);
        
        if (districts.length === 0) {
          await message.reply('කණගාටුයි, මෙම පළාතේ සැපයුම්කරුවන් නොමැත.');
          clearSession(userPhone);
          return;
        }
        
        await message.reply(responses.selectDistrict(selectedProvince, districts));
        updateData(userPhone, { selectedProvince, districts });
        updateState(userPhone, STATES.REQUESTER_SELECTING_DISTRICT);
        break;

      case STATES.REQUESTER_SELECTING_DISTRICT:
        const districtNum = parseInt(msgBody.trim());
        const districts2 = session.data.districts || [];
        
        if (isNaN(districtNum) || districtNum < 1 || districtNum > districts2.length) {
          await message.reply('කරුණාකර නිවැරදි අංකයක් යොමු කරන්න.');
          return;
        }
        
        const selectedDistrict = districts2[districtNum - 1];
        const cities = await getCitiesByDistrict(session.data.selectedProvince, selectedDistrict);
        
        if (cities.length === 0) {
          await message.reply('කණගාටුයි, මෙම දිස්ත්‍රික්කයේ සැපයුම්කරුවන් නොමැත.');
          clearSession(userPhone);
          return;
        }
        
        await message.reply(responses.selectCity(selectedDistrict, cities));
        updateData(userPhone, { selectedDistrict, cities });
        updateState(userPhone, STATES.REQUESTER_SELECTING_CITY);
        break;

      case STATES.REQUESTER_SELECTING_CITY:
        // Parse selected city numbers (e.g., "1" or "1,2,3")
        const cityNumbers = msgBody.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
        const cities2 = session.data.cities || [];
        
        if (cityNumbers.length === 0) {
          await message.reply('කරුණාකර නිවැරදි අංකයක් යොමු කරන්න.\nඋදාහරණ: 1 හෝ 1,2');
          return;
        }
        
        const selectedCities = [];
        for (const num of cityNumbers) {
          if (num >= 1 && num <= cities2.length) {
            selectedCities.push(cities2[num - 1]);
          }
        }
        
        if (selectedCities.length === 0) {
          await message.reply('කරුණාකර නිවැරදි අංකයක් යොමු කරන්න.');
          return;
        }
        
        // Search suppliers in selected cities
        const manualSuppliers = await searchSuppliersByManualLocation(
          session.data.selectedProvince,
          session.data.selectedDistrict,
          selectedCities
        );
        
        // Search officers in selected cities
        const manualOfficers = await searchOfficersByManualLocation(
          session.data.selectedProvince,
          session.data.selectedDistrict,
          selectedCities
        );
        
        const totalResults = manualSuppliers.length + manualOfficers.length;
        
        if (totalResults > 0) {
          const locationStr = `${selectedCities.join(', ')}, ${session.data.selectedDistrict}`;
          await message.reply(responses.suppliersFound(
            { city: locationStr, district: session.data.selectedDistrict }, 
            manualSuppliers, 
            manualOfficers, 
            'city'
          ));
        } else {
          await message.reply('කණගාටුයි, තෝරාගත් නගරවල සම්පත් නොමැත.');
        }
        
        await log({ 
          user: userPhone, 
          action: 'REQUESTER_MANUAL_SELECTION', 
          details: { 
            province: session.data.selectedProvince, 
            district: session.data.selectedDistrict, 
            cities: selectedCities, 
            suppliers: manualSuppliers.length,
            officers: manualOfficers.length
          } 
        });
        clearSession(userPhone);
        break;

      default:
        // Should not happen, but reset if it does
        await message.reply(responses.welcome());
        updateState(userPhone, STATES.WAITING_FOR_ROLE);
        break;
    }

  } catch (error) {
    console.error('Error handling message:', error);
    await message.reply(responses.error());
  }
}

module.exports = {
  handleMessage
};

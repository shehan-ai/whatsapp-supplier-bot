/**
 * Response messages in Sinhala
 */

const responses = {
  // Welcome & Role Selection
  welcome: () => `BuildStart Agent වෙත ඉතාමත් ආදරයෙන් පිලිගනිමු!❤️ පවතින තත්වය හමුවේ එක්ව නැගිටින්නට ඔබත් අපගේ සේවාව භාවිතා කරන්න. ඔබගේ අවශ්‍යතාවය සදහන් කරන්න\n\n1. සැපයුම්කරු\n2. ඉල්ලුම්කරු\n\n( 1 හෝ 2 ලෙස type කරන්න)`,
  
  // Supplier Flow
  askAreas: () => `සැපයුම්කරු\n\nඔබ සිටින ස්ථානය පහත පරිදි එවන්න\n\n1️⃣ පියවර 1: Attachment බොත්තම ඔබන්න\n2️⃣ පියවර 2: Location තෝරන්න\n3️⃣ පියවර 3: "Send your current location" ක්ලික් කරන්න`,
  
  askSupplyTypes: () => `ඔබ දායක වන ආකාරය පැහැදිලි කරන්න\n\n1. වියලි ආහාර\n2. පානීය ජලය\n3. ඖෂධ\n4. ඇදුම් හා රෙදිපිලි\n5. සනීපාරක්ෂක ද්‍රව්‍ය\n\nදායක වන අයිතමවල අංක කොමා යොදමින් ඇතුලත් කරන්න.\n\n(උදාහරණ: 1,2,3 හෝ 1,4,5)`,
  
  supplierSuccess: () => `ඔබගේ සැපයුම හැකි ඉක්මනින් ඉල්ලුම්කරුවෙකු වෙත යොමු කරන්නම්.\nඔබ මේ දක්වන සහයෝගයට බොහෝමත් ස්තුතියි ❤️`,
  
  // Requester Flow
  askLocation: () => `ඔබ සිටින ස්ථානය පහත පරිදි එවන්න\n\n1️⃣ පියවර 1: Attachment බොත්තම ඔබන්න\n2️⃣ පියවර 2: Location තෝරන්න\n3️⃣ පියවර 3: "Send your current location" ක්ලික් කරන්න\n\n━━━━━━━━━━━━━━━━━━━\n\n📱 Location share කළ නොහැකි නම්?\n👉 0 යොදන්න - පළාත/දිස්ත්‍රික්කය/නගරය අතින් තෝරන්න`,
  
  // Results
  suppliersFound: (location, suppliers, officers, matchLevel) => {
    const locationStr = typeof location === 'string' ? location : `${location.city}, ${location.district}`;
    const totalCount = suppliers.length + officers.length;
    
    // Add match level header
    let header = '';
    if (matchLevel === 'city') {
      header = `📍 ${locationStr} හි යෝජිත සම්පත් (${totalCount}):\n\n`;
    } else if (matchLevel === 'district') {
      header = `📍 ${location.district} දිස්ත්‍රික්කයේ යෝජිත සම්පත් (${totalCount}):\n(ඔබගේ නගරයෙන් සම්පත් නොමැති නිසා දිස්ත්‍රික්කයේ සියලු සම්පත් පෙන්වයි)\n\n`;
    } else if (matchLevel === 'province') {
      header = `📍 ${location.province} පළාතේ යෝජිත සම්පත් (${totalCount}):\n(ඔබගේ දිස්ත්‍රික්කයෙන් සම්පත් නොමැති නිසා පළාතේ සියලු සම්පත් පෙන්වයි)\n\n`;
    } else {
      header = `📍 ශ්‍රී ලංකාවේ සියලු යෝජිත සම්පත් (${totalCount}):\n(ඔබගේ ප්‍රදේශයට ආසන්නව සම්පත් නොමැත)\n\n`;
    }
    
    let msg = header;
    let index = 1;
    
    // Show Suppliers first
    if (suppliers.length > 0) {
      msg += `━━━ සැපයුම්කරුවන් (${suppliers.length}) ━━━\n\n`;
      
      suppliers.forEach((s) => {
        const cleanPhone = s.phone.replace('@c.us', '');
        msg += `${index}. සැපයුම්කරු ${index}\n`;
        msg += `   📞 ${cleanPhone}\n`;
        
        if (s.location) {
          msg += `   📍 ${s.location.city}, ${s.location.district}\n`;
        }
        
        const types = [];
        if (s.supplies && Array.isArray(s.supplies)) {
          if (s.supplies[0]) types.push('වියලි ආහාර');
          if (s.supplies[1]) types.push('පානීය ජලය');
          if (s.supplies[2]) types.push('ඖෂධ');
          if (s.supplies[3]) types.push('ඇදුම්');
          if (s.supplies[4]) types.push('සනීපාරක්ෂක');
        }
        
        const suppliesText = types.length > 0 ? types.join(', ') : 'None';
        msg += `   📦 සැපයුම්: ${suppliesText}\n\n`;
        index++;
      });
    }
    
    // Show Officers
    if (officers.length > 0) {
      msg += `━━━ රජයේ නිලධාරීන් (${officers.length}) ━━━\n\n`;
      
      officers.forEach((o) => {
        const cleanPhone = o.phone.replace('@c.us', '');
        msg += `${index}. ${o.name || 'නිලධාරී'}\n`;
        msg += `   📍 ${o.division || o.district}\n`;
        msg += `   📞 ${cleanPhone}\n`;
        
        if (o.officeTelephone) {
          msg += `   ☎️ කාර්යාලය: ${o.officeTelephone}\n`;
        }
        
        if (o.fax) {
          msg += `   📠 ෆැක්ස්: ${o.fax}\n`;
        }
        
        msg += `\n`;
        index++;
      });
    }
    
    return msg;
  },
  
  noSuppliersFound: (location) => {
    const locationStr = typeof location === 'string' ? location : `${location.city}, ${location.district}, ${location.province}`;
    return `කණගාටුයි, ${locationStr} අවට සැපයුම්කරුවන් තවම ලියාපදිංචි වී නොමැත.`;
  },
  
  availableCities: (cities) => {
    let msg = `📍 දැනට සැපයුම් ලබා ගත හැකි ප්‍රදේශ:\n\n`;
    cities.forEach((city, i) => {
      msg += `${i+1}. ${city}\n`;
    });
    msg += `\nඔබට අවශ්‍ය ප්‍රදේශයේ අංකය යොමු කරන්න.\n(උදාහරණ: 1 හෝ 1,2,3)`;
    return msg;
  },
  
  // Manual location selection
  selectProvince: (provinces) => {
    let msg = `📍 පළාත තෝරන්න:\n\n`;
    provinces.forEach((province, i) => {
      msg += `${i+1}. ${province}\n`;
    });
    msg += `\nඔබගේ පළාතේ අංකය යොමු කරන්න`;
    return msg;
  },

  selectDistrict: (province, districts) => {
    let msg = `📍 ${province} - දිස්ත්‍රික්කය තෝරන්න:\n\n`;
    districts.forEach((district, i) => {
      msg += `${i+1}. ${district}\n`;
    });
    msg += `\nඔබගේ දිස්ත්‍රික්කයේ අංකය යොමු කරන්න`;
    return msg;
  },

  selectCity: (district, cities) => {
    let msg = `📍 ${district} - නගරය තෝරන්න:\n\n`;
    cities.forEach((city, i) => {
      msg += `${i+1}. ${city}\n`;
    });
    msg += `\nඔබගේ නගරයේ අංකය යොමු කරන්න\n(උදාහරණ: 1 හෝ 1,2)`;
    return msg;
  },
  
  // Errors
  invalidInput: () => `කරුණාකර නිවැරදි අංකය ඇතුලත් කරන්න. (1 හෝ 2)`,
  
  invalidLocation: () => `කරුණාකර ඔබගේ Location එක නිවැරදිව යොමු කරන්න.\n\nAttachment > Location > Send your current location භාවිතා කරන්න.`,
  
  invalidAreas: () => `කරුණාකර අවම වශයෙන් එක් ප්‍රදේශයක් හෝ ඇතුලත් කරන්න.`,
  
  invalidSupplies: () => `කරුණාකර නිවැරදි ආකෘතියට ඇතුලත් කරන්න.\nඋදාහරණ: 1,0,0,0,1`,
  
  error: () => `දෝෂයක් ඇතිවිය. කරුණාකර නැවත උත්සාහ කරන්න.`
};

module.exports = responses;

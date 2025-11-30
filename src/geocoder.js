const axios = require('axios');
const { getCachedLocation, setCachedLocation } = require('./geocodeCache');

/**
 * Reverse geocode coordinates to location details using OpenStreetMap (Nominatim)
 * @param {number} lat 
 * @param {number} lng 
 * @returns {Promise<Object>} Location object with city, district, province, lat, lng
 */
async function reverseGeocode(lat, lng) {
  // Check cache first
  const cachedLocation = await getCachedLocation(lat, lng);
  if (cachedLocation) {
    console.log(`📍 Cache hit for ${lat},${lng}: ${cachedLocation.city}`);
    return cachedLocation;
  }

  try {
    // Nominatim API endpoint
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    
    // Nominatim requires a User-Agent header
    const headers = {
      'User-Agent': 'WhatsAppSupplierBot/1.0 (contact@buildstart.io)' 
    };

    console.log(`🌍 Fetching location from OSM: ${lat},${lng}`);
    const response = await axios.get(url, { headers, timeout: 10000 });
    
    if (response.data && response.data.address) {
      const address = response.data.address;
      
      const location = {
        city: address.city || 
              address.town || 
              address.village || 
              address.suburb || 
              address.hamlet ||
              'Unknown City',
        
        district: address.county || 
                  address.state_district ||
                  address.administrative_area_level_2 ||
                  'Unknown District',
        
        province: address.state || 
                  address.region ||
                  address.administrative_area_level_1 ||
                  'Unknown Province',
        
        lat: lat,
        lng: lng
      };

      console.log(`✅ Geocoded: ${location.city}, ${location.district}, ${location.province}`);
      
      // Save to cache
      await setCachedLocation(lat, lng, location);
      
      return location;
    }
    
    // Fallback if no data
    return {
      city: 'Unknown City',
      district: 'Unknown District',
      province: 'Unknown Province',
      lat: lat,
      lng: lng
    };
    
  } catch (error) {
    console.error('❌ Geocoding error:', error.message);
    // Return a fallback if API fails
    return {
      city: 'Unknown City',
      district: 'Unknown District',
      province: 'Unknown Province',
      lat: lat,
      lng: lng
    };
  }
}

module.exports = {
  reverseGeocode
};

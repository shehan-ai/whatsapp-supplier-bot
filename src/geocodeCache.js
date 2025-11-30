const fs = require('fs').promises;
const path = require('path');

const CACHE_FILE = path.join(__dirname, '../cache/geocode.json');

/**
 * Load geocode cache from file
 */
async function loadCache() {
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or is invalid, return empty cache
    return {};
  }
}

/**
 * Save geocode cache to file
 */
async function saveCache(cache) {
  try {
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving cache:', error);
  }
}

/**
 * Get cached geocode result if it exists and is not expired
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Object|null} - Location object or null if not in cache or expired
 */
async function getCachedLocation(lat, lng) {
  const cache = await loadCache();
  const key = `${lat},${lng}`;
  const entry = cache[key];

  if (!entry) {
    return null;
  }

  // Check if cache entry is expired
  const cacheExpiryHours = parseInt(process.env.CACHE_EXPIRY_HOURS || '24');
  const expiryMs = cacheExpiryHours * 60 * 60 * 1000;
  const entryTime = new Date(entry.timestamp).getTime();
  const now = new Date().getTime();

  if (now - entryTime > expiryMs) {
    return null; // Expired
  }

  return entry.location;
}

/**
 * Save location result to cache
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {Object} location - Location object {city, district, province, lat, lng}
 */
async function setCachedLocation(lat, lng, location) {
  const cache = await loadCache();
  const key = `${lat},${lng}`;

  cache[key] = {
    location: location,
    timestamp: new Date().toISOString()
  };

  await saveCache(cache);
}

module.exports = {
  getCachedLocation,
  setCachedLocation
};

/**
 * Parse Google Maps URL and extract coordinates
 * Supports various Google Maps URL formats
 */
function parseLocationUrl(url) {
  try {
    // Format 1: https://maps.google.com/?q=6.9271,79.8612
    const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (qMatch) {
      return {
        lat: parseFloat(qMatch[1]),
        lng: parseFloat(qMatch[2])
      };
    }

    // Format 2: https://www.google.com/maps/@6.9271,79.8612,15z
    const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (atMatch) {
      return {
        lat: parseFloat(atMatch[1]),
        lng: parseFloat(atMatch[2])
      };
    }

    // Format 3: https://goo.gl/maps/... or https://maps.app.goo.gl/...
    // These are shortened URLs - extract from query params if present
    const llMatch = url.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (llMatch) {
      return {
        lat: parseFloat(llMatch[1]),
        lng: parseFloat(llMatch[2])
      };
    }

    // Format 4: https://www.google.com/maps/place/@6.9271,79.8612
    const placeMatch = url.match(/place\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (placeMatch) {
      return {
        lat: parseFloat(placeMatch[1]),
        lng: parseFloat(placeMatch[2])
      };
    }

    return null;
  } catch (error) {
    console.error('Error parsing location URL:', error);
    return null;
  }
}

/**
 * Validate that coordinates are within valid ranges
 */
function validateCoordinates(lat, lng) {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

module.exports = {
  parseLocationUrl,
  validateCoordinates
};

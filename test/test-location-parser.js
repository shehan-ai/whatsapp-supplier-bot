const { parseLocationUrl, validateCoordinates } = require('../src/locationParser');

console.log('🧪 Testing Location Parser...\n');

const testCases = [
  'https://maps.google.com/?q=6.9271,79.8612',
  'https://www.google.com/maps/@6.9271,79.8612,15z',
  'https://www.google.com/maps/place/@5.9496,80.5469',
  'https://goo.gl/maps/abc?ll=7.8731,80.7718',
  'invalid-url',
  'https://maps.google.com/?q=999,999' // Invalid coordinates
];

testCases.forEach((url, index) => {
  console.log(`Test ${index + 1}: ${url}`);
  const coords = parseLocationUrl(url);
  
  if (coords) {
    const isValid = validateCoordinates(coords.lat, coords.lng);
    console.log(`  ✅ Parsed: lat=${coords.lat}, lng=${coords.lng}`);
    console.log(`  ${isValid ? '✅' : '❌'} Valid: ${isValid}`);
  } else {
    console.log('  ❌ Failed to parse');
  }
  console.log('');
});

console.log('✅ Location parser tests completed!');

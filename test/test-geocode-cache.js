const { getCachedCity, setCachedCity } = require('../src/geocodeCache');

async function runTests() {
  console.log('🧪 Testing Geocode Cache...\n');

  try {
    const testLat = 6.9271;
    const testLng = 79.8612;
    const testCity = 'Colombo';

    // Test 1: Cache miss (should return null)
    console.log('Test 1: Cache miss...');
    const result1 = await getCachedCity(testLat, testLng);
    console.log(`  ${result1 === null ? '✅' : '❌'} Cache miss: ${result1 === null}`);
    console.log('');

    // Test 2: Set cache
    console.log('Test 2: Setting cache...');
    await setCachedCity(testLat, testLng, testCity);
    console.log('  ✅ Cache entry saved');
    console.log('');

    // Test 3: Cache hit
    console.log('Test 3: Cache hit...');
    const result2 = await getCachedCity(testLat, testLng);
    console.log(`  ${result2 === testCity ? '✅' : '❌'} Cache hit: ${result2 === testCity}`);
    console.log(`  Retrieved city: ${result2}`);
    console.log('');

    // Test 4: Different coordinates (cache miss)
    console.log('Test 4: Different coordinates...');
    const result3 = await getCachedCity(5.9496, 80.5469);
    console.log(`  ${result3 === null ? '✅' : '❌'} Cache miss for different coords: ${result3 === null}`);
    console.log('');

    console.log('✅ All geocode cache tests completed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

runTests();

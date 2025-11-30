const { upsertSupplier, searchSuppliersByCity, getRecentSuppliers } = require('../src/supplierManager');

async function runTests() {
  console.log('🧪 Testing Supplier Manager...\n');

  try {
    // Test 1: Create new supplier
    console.log('Test 1: Creating new supplier...');
    const result1 = await upsertSupplier({
      phone: '0771234567',
      name: 'Kamal Hardware',
      category: 'Hardware',
      city: 'Matara',
      location: { lat: 5.9496, lng: 80.5469 }
    });
    console.log(`  ${result1.isNew ? '✅' : '❌'} New supplier created: ${result1.isNew}`);
    console.log('');

    // Test 2: Update existing supplier
    console.log('Test 2: Updating existing supplier...');
    const result2 = await upsertSupplier({
      phone: '0771234567',
      name: 'Kamal Hardware & Tools',
      category: 'Hardware',
      city: 'Matara',
      location: { lat: 5.9496, lng: 80.5469 }
    });
    console.log(`  ${!result2.isNew ? '✅' : '❌'} Supplier updated: ${!result2.isNew}`);
    console.log(`  Name updated to: ${result2.supplier.name}`);
    console.log('');

    // Test 3: Create another supplier in a different city
    console.log('Test 3: Creating supplier in different city...');
    await upsertSupplier({
      phone: '0712223344',
      name: 'Nuwan Traders',
      category: 'General',
      city: 'Colombo',
      location: { lat: 6.9271, lng: 79.8612 }
    });
    console.log('  ✅ Second supplier created');
    console.log('');

    // Test 4: Search by city
    console.log('Test 4: Searching suppliers in Matara...');
    const suppliers = await searchSuppliersByCity('Matara');
    console.log(`  ${suppliers.length === 1 ? '✅' : '❌'} Found ${suppliers.length} supplier(s) in Matara`);
    if (suppliers.length > 0) {
      console.log(`  First supplier: ${suppliers[0].name}`);
    }
    console.log('');

    // Test 5: Get recent suppliers
    console.log('Test 5: Getting recent suppliers...');
    const recent = await getRecentSuppliers();
    console.log(`  ✅ Found ${recent.length} recent supplier(s)`);
    console.log('');

    console.log('✅ All supplier manager tests completed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

runTests();

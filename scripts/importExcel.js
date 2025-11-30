const XLSX = require('xlsx');
const fs = require('fs').promises;
const path = require('path');

/**
 * Import suppliers from Excel file
 * This script reads the District Relief Officers GNs List and imports them to the database
 */

const EXCEL_FILE = path.join(__dirname, '../../District Relief Officers GNs List.xlsx');
const OFFICERS_FILE = path.join(__dirname, '../data/officers.json');
const BACKUP_FILE = path.join(__dirname, '../data/officers_backup_before_import.json');

/**
 * Map district to province (Sri Lankan administrative divisions)
 */
function getProvinceFromDistrict(district) {
  const mapping = {
    'Colombo': 'Western Province',
    'Gampaha': 'Western Province',
    'Kalutara': 'Western Province',
    'Kandy': 'Central Province',
    'Matale': 'Central Province',
    'Nuwara Eliya': 'Central Province',
    'Galle': 'Southern Province',
    'Matara': 'Southern Province',
    'Hambantota': 'Southern Province',
    'Jaffna': 'Northern Province',
    'Kilinochchi': 'Northern Province',
    'Mannar': 'Northern Province',
    'Mullaitivu': 'Northern Province',
    'Vavuniya': 'Northern Province',
    'Batticaloa': 'Eastern Province',
    'Ampara': 'Eastern Province',
    'Trincomalee': 'Eastern Province',
    'Kurunegala': 'North Western Province',
    'Puttalam': 'North Western Province',
    'Anuradhapura': 'North Central Province',
    'Polonnaruwa': 'North Central Province',
    'Badulla': 'Uva Province',
    'Monaragala': 'Uva Province',
    'Ratnapura': 'Sabaragamuwa Province',
    'Kegalle': 'Sabaragamuwa Province'
  };
  
  return mapping[district] || 'Unknown Province';
}


async function importFromExcel() {
  try {
    console.log('📂 Reading Excel file...');
    
    // Read Excel file
    const workbook = XLSX.readFile(EXCEL_FILE);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(sheet);
    
    console.log(`✅ Found ${data.length} rows in Excel file`);
    
    // Load existing officers
    let officers = {};
    try {
      const existing = await fs.readFile(OFFICERS_FILE, 'utf8');
      officers = JSON.parse(existing);
      
      // Create backup
      await fs.writeFile(BACKUP_FILE, JSON.stringify(officers, null, 2));
      console.log('💾 Backup created:', BACKUP_FILE);
    } catch (error) {
      console.log('ℹ️ No existing officers database, starting fresh');
    }
    
    // Process each row
    let imported = 0;
    let skipped = 0;
    
    for (const row of data) {
      try {
        // Skip header row
        if (row['Divisional Secretaries Data Base'] === 'District') continue;
        
        // Map ALL Excel columns
        const district = row['Divisional Secretaries Data Base'];
        const divisionNumber = row['__EMPTY'];
        const division = row['__EMPTY_1'];
        const dsName = row['__EMPTY_2'];
        const dsClass = row['__EMPTY_3'];
        const mobile = row['__EMPTY_4'];
        const officeTelephone = row['__EMPTY_5'];
        const fax = row['__EMPTY_6'];
        
        if (!mobile || !district) {
          skipped++;
          continue;
        }
        
        // Clean phone number
        let cleanPhone = String(mobile).replace(/[^0-9]/g, '');
        if (!cleanPhone || cleanPhone.length < 9) {
          skipped++;
          continue;
        }
        
        if (!cleanPhone.startsWith('94')) {
          if (cleanPhone.startsWith('0')) {
            cleanPhone = '94' + cleanPhone.substring(1);
          } else {
            cleanPhone = '94' + cleanPhone;
          }
        }
        const whatsappId = cleanPhone + '@c.us';
        
        // Create officer data WITH ALL COLUMNS
        const officerData = {
          phone: whatsappId,
          name: dsName || 'Divisional Secretary',
          division: division || '',
          divisionNumber: divisionNumber || '',
          district: district,
          province: getProvinceFromDistrict(district),
          class: dsClass || '',
          officeTelephone: officeTelephone || '',
          fax: fax || '',
          type: 'officer',
          location: {
            city: division || district, // Use division as city
            district: district + ' District',
            province: getProvinceFromDistrict(district),
            lat: 0,
            lng: 0
          },
          supplies: [true, true, true, true, true], // Officers provide all supplies
          updated_at: new Date().toISOString(),
          created_at: officers[whatsappId]?.created_at || new Date().toISOString()
        };
        
        officers[whatsappId] = officerData;
        imported++;
        
      } catch (error) {
        console.error('⚠️ Error processing row:', error.message);
        skipped++;
      }
    }
    
    // Save to officers database
    await fs.writeFile(OFFICERS_FILE, JSON.stringify(officers, null, 2));
    
    console.log('\n✅ Import Complete!');
    console.log(`📊 Imported: ${imported} officers`);
    console.log(`⏭️ Skipped: ${skipped} rows`);
    console.log(`💾 Total officers in database: ${Object.keys(officers).length}`);
    
  } catch (error) {
    console.error('❌ Import failed:', error);
  }
}

// Run import
importFromExcel();

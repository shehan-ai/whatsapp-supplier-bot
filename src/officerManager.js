const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const OFFICERS_FILE = path.join(__dirname, '../data/officers.json');
const BACKUP_DIR = path.join(__dirname, '../data/backups');
const TEMP_FILE = OFFICERS_FILE + '.tmp';

// Write queue to prevent simultaneous writes
let writeQueue = Promise.resolve();

/**
 * Ensure backup directory exists
 */
async function ensureBackupDir() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  } catch (error) {
    // Directory exists
  }
}

/**
 * Validate officer data structure
 */
function validateOfficer(officer) {
  const errors = [];
  
  if (!officer.phone || typeof officer.phone !== 'string') {
    errors.push('Invalid or missing phone');
  }
  
  if (!officer.name) errors.push('Missing name');
  if (!officer.district) errors.push('Missing district');
  
  if (errors.length > 0) {
    throw new Error(`Officer validation failed: ${errors.join(', ')}`);
  }
  
  return true;
}

/**
 * Load officers with automatic recovery
 */
async function loadOfficers() {
  try {
    const data = await fs.readFile(OFFICERS_FILE, 'utf8');
    const officers = JSON.parse(data);
    
    if (typeof officers !== 'object') {
      throw new Error('Invalid officers data structure');
    }
    
    console.log(`✅ Loaded ${Object.keys(officers).length} officers from database`);
    return officers;
    
  } catch (error) {
    console.warn('⚠️ Officers file missing or corrupted, starting fresh');
    return {};
  }
}

/**
 * Create daily backup
 */
async function createBackup() {
  try {
    await ensureBackupDir();
    
    if (!fsSync.existsSync(OFFICERS_FILE)) {
      return;
    }
    
    const timestamp = new Date().toISOString().split('T')[0];
    const backupFile = path.join(BACKUP_DIR, `officers_${timestamp}.json`);
    
    await fs.copyFile(OFFICERS_FILE, backupFile);
    
    const latestBackup = path.join(BACKUP_DIR, 'officers.json.backup');
    await fs.copyFile(OFFICERS_FILE, latestBackup);
    
    console.log(`💾 Officers backup created: ${timestamp}`);
    
  } catch (error) {
    console.error('❌ Backup creation failed:', error.message);
  }
}

/**
 * Atomic write with backup - CRASH PROOF
 */
async function saveOfficers(officers) {
  writeQueue = writeQueue.then(async () => {
    try {
      // Validate all officers
      for (const phone in officers) {
        validateOfficer(officers[phone]);
      }
      
      // Create backup
      await createBackup();
      
      // Write to temp file
      await fs.writeFile(TEMP_FILE, JSON.stringify(officers, null, 2), 'utf8');
      
      // Atomic rename
      await fs.rename(TEMP_FILE, OFFICERS_FILE);
      
      console.log(`💾 Officers database saved: ${Object.keys(officers).length} officers`);
      
    } catch (error) {
      console.error('❌ Error saving officers:', error.message);
      
      if (fsSync.existsSync(TEMP_FILE)) {
        await fs.unlink(TEMP_FILE);
      }
      
      throw error;
    }
  });
  
  return writeQueue;
}

/**
 * Upsert an officer
 */
async function upsertOfficer(officerData) {
  const officers = await loadOfficers();
  const phone = officerData.phone;
  const now = new Date().toISOString();

  officers[phone] = {
    ...officers[phone],
    ...officerData,
    updated_at: now
  };
  
  if (!officers[phone].created_at) {
    officers[phone].created_at = now;
  }

  validateOfficer(officers[phone]);
  await saveOfficers(officers);
  return officers[phone];
}

/**
 * Search officers by location (Province → District → City)
 */
async function searchOfficersByLocation(requesterLocation) {
  const officers = await loadOfficers();
  const allOfficers = Object.values(officers);
  
  if (allOfficers.length === 0) {
    return { officers: [], matchLevel: 'none' };
  }
  
  const reqProvince = requesterLocation.province.toLowerCase().trim();
  const reqDistrict = requesterLocation.district.toLowerCase().trim();
  const reqCity = requesterLocation.city.toLowerCase().trim();

  // Level 1: City Match
  const cityMatches = allOfficers.filter(o => {
    if (!o.location) return false;
    return o.location.city.toLowerCase().trim() === reqCity &&
           o.location.district.toLowerCase().trim() === reqDistrict &&
           o.location.province.toLowerCase().trim() === reqProvince;
  });

  if (cityMatches.length > 0) {
    console.log(`📍 City match: Found ${cityMatches.length} officers in ${reqCity}`);
    return { officers: cityMatches, matchLevel: 'city' };
  }

  // Level 2: District Match
  const districtMatches = allOfficers.filter(o => {
    if (!o.location) return false;
    return o.location.district.toLowerCase().trim() === reqDistrict &&
           o.location.province.toLowerCase().trim() === reqProvince;
  });

  if (districtMatches.length > 0) {
    console.log(`📍 District match: Found ${districtMatches.length} officers in ${reqDistrict}`);
    return { officers: districtMatches, matchLevel: 'district' };
  }

  // Level 3: Province Match
  const provinceMatches = allOfficers.filter(o => {
    if (!o.location) return false;
    return o.location.province.toLowerCase().trim() === reqProvince;
  });

  if (provinceMatches.length > 0) {
    console.log(`📍 Province match: Found ${provinceMatches.length} officers in ${reqProvince}`);
    return { officers: provinceMatches, matchLevel: 'province' };
  }

  console.log(`📍 No match: Showing all ${allOfficers.length} officers`);
  return { officers: allOfficers, matchLevel: 'all' };
}

/**
 * Search officers by manually selected province/district/cities
 */
async function searchOfficersByManualLocation(province, district, cities) {
  const officers = await loadOfficers();
  const allOfficers = Object.values(officers);
  
  if (allOfficers.length === 0) {
    return [];
  }
  
  const provinceLC = province.toLowerCase().trim();
  const districtLC = district.toLowerCase().trim();
  const citiesLC = cities.map(c => c.toLowerCase().trim());
  
  // Filter officers matching province, district, and any of the selected cities
  const matchedOfficers = allOfficers.filter(o => {
    if (!o.location) return false;
    
    const oProvince = o.location.province.toLowerCase().trim();
    const oDistrict = o.location.district.toLowerCase().trim();
    const oCity = o.location.city.toLowerCase().trim();
    
    return oProvince === provinceLC && 
           oDistrict === districtLC && 
           citiesLC.includes(oCity);
  });
  
  console.log(`📍 Manual selection: Found ${matchedOfficers.length} officers in ${cities.join(', ')}, ${district}`);
  return matchedOfficers;
}

module.exports = {
  upsertOfficer,
  searchOfficersByLocation,
  searchOfficersByManualLocation,
  loadOfficers,
  saveOfficers
};

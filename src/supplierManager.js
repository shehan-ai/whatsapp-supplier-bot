const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const SUPPLIERS_FILE = path.join(__dirname, '../data/suppliers.json');
const BACKUP_DIR = path.join(__dirname, '../data/backups');
const TEMP_FILE = SUPPLIERS_FILE + '.tmp';
const LOCK_FILE = SUPPLIERS_FILE + '.lock';

// Write queue to prevent simultaneous writes
let writeQueue = Promise.resolve();
let isWriting = false;

/**
 * Ensure backup directory exists
 */
async function ensureBackupDir() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  } catch (error) {
    // Directory exists or error
  }
}

/**
 * Validate supplier data structure
 */
function validateSupplier(supplier) {
  const errors = [];
  
  if (!supplier.phone || typeof supplier.phone !== 'string') {
    errors.push('Invalid or missing phone');
  }
  
  if (!supplier.location || typeof supplier.location !== 'object') {
    errors.push('Invalid or missing location');
  } else {
    if (!supplier.location.city) errors.push('Missing location.city');
    if (!supplier.location.district) errors.push('Missing location.district');
    if (!supplier.location.province) errors.push('Missing location.province');
  }
  
  if (!Array.isArray(supplier.supplies) || supplier.supplies.length !== 5) {
    errors.push('Invalid supplies array (must have 5 boolean values)');
  }
  
  if (!supplier.updated_at) errors.push('Missing updated_at');
  if (!supplier.created_at) errors.push('Missing created_at');
  
  if (errors.length > 0) {
    throw new Error(`Supplier validation failed: ${errors.join(', ')}`);
  }
  
  return true;
}

/**
 * Load suppliers with automatic recovery from corruption
 */
async function loadSuppliers() {
  try {
    // Try loading main file
    const data = await fs.readFile(SUPPLIERS_FILE, 'utf8');
    const suppliers = JSON.parse(data);
    
    // Validate structure
    if (typeof suppliers !== 'object') {
      throw new Error('Invalid suppliers data structure');
    }
    
    console.log(`✅ Loaded ${Object.keys(suppliers).length} suppliers from database`);
    return suppliers;
    
  } catch (error) {
    console.warn('⚠️ Main database file corrupted or missing:', error.message);
    
    // Try loading from backup
    try {
      const backupFile = path.join(BACKUP_DIR, 'suppliers.json.backup');
      if (fsSync.existsSync(backupFile)) {
        console.log('🔄 Attempting recovery from backup...');
        const backupData = await fs.readFile(backupFile, 'utf8');
        const suppliers = JSON.parse(backupData);
        
        // Restore from backup
        await saveSuppliers(suppliers);
        console.log('✅ Successfully recovered from backup!');
        return suppliers;
      }
    } catch (backupError) {
      console.error('❌ Backup recovery failed:', backupError.message);
    }
    
    // Return empty database as last resort
    console.log('⚠️ Starting with empty database');
    return {};
  }
}

/**
 * Create daily backup with rotation (keep 7 days)
 */
async function createBackup() {
  try {
    await ensureBackupDir();
    
    if (!fsSync.existsSync(SUPPLIERS_FILE)) {
      return; // Nothing to backup
    }
    
    // Create timestamped backup
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const backupFile = path.join(BACKUP_DIR, `suppliers_${timestamp}.json`);
    
    // Copy current file to backup
    await fs.copyFile(SUPPLIERS_FILE, backupFile);
    
    // Also maintain a "latest" backup
    const latestBackup = path.join(BACKUP_DIR, 'suppliers.json.backup');
    await fs.copyFile(SUPPLIERS_FILE, latestBackup);
    
    console.log(`💾 Backup created: ${timestamp}`);
    
    // Clean old backups (keep 7 days)
    await cleanOldBackups();
    
  } catch (error) {
    console.error('❌ Backup creation failed:', error.message);
  }
}

/**
 * Remove backups older than 7 days
 */
async function cleanOldBackups() {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const now = new Date();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    
    for (const file of files) {
      if (file.startsWith('suppliers_') && file.endsWith('.json')) {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < sevenDaysAgo) {
          await fs.unlink(filePath);
          console.log(`🗑️ Deleted old backup: ${file}`);
        }
      }
    }
  } catch (error) {
    console.error('⚠️ Backup cleanup failed:', error.message);
  }
}

/**
 * Atomic write with backup - CRASH PROOF
 */
async function saveSuppliers(suppliers) {
  // Add to write queue to prevent simultaneous writes
  writeQueue = writeQueue.then(async () => {
    try {
      isWriting = true;
      
      // Validate all suppliers before writing
      for (const phone in suppliers) {
        validateSupplier(suppliers[phone]);
      }
      
      // Create backup before writing
      await createBackup();
      
      // Write to temporary file first
      await fs.writeFile(TEMP_FILE, JSON.stringify(suppliers, null, 2), 'utf8');
      
      // Atomic rename (this operation is crash-safe)
      await fs.rename(TEMP_FILE, SUPPLIERS_FILE);
      
      console.log(`💾 Database saved: ${Object.keys(suppliers).length} suppliers`);
      
    } catch (error) {
      console.error('❌ Error saving suppliers:', error.message);
      
      // Clean up temp file if it exists
      try {
        if (fsSync.existsSync(TEMP_FILE)) {
          await fs.unlink(TEMP_FILE);
        }
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      throw error;
    } finally {
      isWriting = false;
    }
  });
  
  return writeQueue;
}

/**
 * Create or update a supplier
 */
async function upsertSupplier(supplierData) {
  const suppliers = await loadSuppliers();
  const phone = supplierData.phone;
  const now = new Date().toISOString();

  suppliers[phone] = {
    ...suppliers[phone], // Keep existing data
    ...supplierData,     // Overwrite with new data
    updated_at: now
  };
  
  if (!suppliers[phone].created_at) {
    suppliers[phone].created_at = now;
  }

  // Validate before saving
  validateSupplier(suppliers[phone]);

  await saveSuppliers(suppliers);
  return suppliers[phone];
}

/**
 * Progressive fallback search: City → District → Province → All
 * ALWAYS returns suppliers (never empty)
 * 
 * @param {Object} requesterLocation - {city, district, province, lat, lng}
 * @returns {Promise<Object>} - {suppliers: Array, matchLevel: string}
 */
async function searchSuppliersByLocation(requesterLocation) {
  const suppliers = await loadSuppliers();
  const allSuppliers = Object.values(suppliers);
  
  if (allSuppliers.length === 0) {
    return { suppliers: [], matchLevel: 'none' };
  }
  
  const reqProvince = requesterLocation.province.toLowerCase().trim();
  const reqDistrict = requesterLocation.district.toLowerCase().trim();
  const reqCity = requesterLocation.city.toLowerCase().trim();

  // Level 1: Try City Match
  const cityMatches = allSuppliers.filter(s => {
    if (!s.location) return false;
    return s.location.city.toLowerCase().trim() === reqCity &&
           s.location.district.toLowerCase().trim() === reqDistrict &&
           s.location.province.toLowerCase().trim() === reqProvince;
  });

  if (cityMatches.length > 0) {
    console.log(`✅ City match: Found ${cityMatches.length} suppliers in ${reqCity}`);
    return { suppliers: cityMatches, matchLevel: 'city' };
  }

  // Level 2: Try District Match
  const districtMatches = allSuppliers.filter(s => {
    if (!s.location) return false;
    return s.location.district.toLowerCase().trim() === reqDistrict &&
           s.location.province.toLowerCase().trim() === reqProvince;
  });

  if (districtMatches.length > 0) {
    console.log(`📍 District match: Found ${districtMatches.length} suppliers in ${reqDistrict}`);
    return { suppliers: districtMatches, matchLevel: 'district' };
  }

  // Level 3: Try Province Match
  const provinceMatches = allSuppliers.filter(s => {
    if (!s.location) return false;
    return s.location.province.toLowerCase().trim() === reqProvince;
  });

  if (provinceMatches.length > 0) {
    console.log(`🌍 Province match: Found ${provinceMatches.length} suppliers in ${reqProvince}`);
    return { suppliers: provinceMatches, matchLevel: 'province' };
  }

  // Level 4: Show ALL suppliers (last resort)
  console.log(`⚠️ No location match - showing all ${allSuppliers.length} suppliers`);
  return { suppliers: allSuppliers, matchLevel: 'all' };
}

/**
 * Get all unique locations grouped by province and district
 * Includes locations from BOTH suppliers and officers
 */
async function getAllAvailableLocations() {
  const suppliers = await loadSuppliers();
  const { loadOfficers } = require('./officerManager');
  const officers = await loadOfficers();
  
  const locations = {};
  
  // Add supplier locations
  for (const phone in suppliers) {
    const supplier = suppliers[phone];
    if (supplier.location) {
      const province = supplier.location.province;
      const district = supplier.location.district;
      const city = supplier.location.city;
      
      if (!locations[province]) {
        locations[province] = {};
      }
      if (!locations[province][district]) {
        locations[province][district] = new Set();
      }
      locations[province][district].add(city);
    }
  }
  
  // Add officer locations
  for (const phone in officers) {
    const officer = officers[phone];
    if (officer.location) {
      const province = officer.location.province;
      const district = officer.location.district;
      const city = officer.location.city;
      
      if (!locations[province]) {
        locations[province] = {};
      }
      if (!locations[province][district]) {
        locations[province][district] = new Set();
      }
      locations[province][district].add(city);
    }
  }
  
  // Convert sets to arrays
  for (const province in locations) {
    for (const district in locations[province]) {
      locations[province][district] = Array.from(locations[province][district]).sort();
    }
  }
  
  return locations;
}

/**
 * Get all unique provinces
 */
async function getAllProvinces() {
  const locations = await getAllAvailableLocations();
  return Object.keys(locations).sort();
}

/**
 * Get all districts in a province
 */
async function getDistrictsByProvince(province) {
  const locations = await getAllAvailableLocations();
  if (!locations[province]) return [];
  return Object.keys(locations[province]).sort();
}

/**
 * Get all cities in a district (within a province)
 */
async function getCitiesByDistrict(province, district) {
  const locations = await getAllAvailableLocations();
  if (!locations[province] || !locations[province][district]) return [];
  return locations[province][district];
}

/**
 * Search suppliers by manually selected location
 */
async function searchSuppliersByManualLocation(province, district, cities) {
  const suppliers = await loadSuppliers();
  const allSuppliers = Object.values(suppliers);
  
  const results = allSuppliers.filter(s => {
    if (!s.location) return false;
    
    const matchProvince = s.location.province === province;
    const matchDistrict = s.location.district === district;
    const matchCity = cities.includes(s.location.city);
    
    return matchProvince && matchDistrict && matchCity;
  });
  
  return results;
}

/**
 * Database health check - run on startup
 */
async function healthCheck() {
  console.log('🏥 Running database health check...');
  
  try {
    const suppliers = await loadSuppliers();
    let validCount = 0;
    let invalidCount = 0;
    
    for (const phone in suppliers) {
      try {
        validateSupplier(suppliers[phone]);
        validCount++;
      } catch (error) {
        console.warn(`⚠️ Invalid supplier ${phone}: ${error.message}`);
        invalidCount++;
      }
    }
    
    console.log(`✅ Health check complete: ${validCount} valid, ${invalidCount} invalid suppliers`);
    
    // Create backup after health check
    await createBackup();
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }
}

module.exports = {
  upsertSupplier,
  searchSuppliersByLocation,
  getAllAvailableLocations,
  getAllProvinces,
  getDistrictsByProvince,
  getCitiesByDistrict,
  searchSuppliersByManualLocation,
  healthCheck
};

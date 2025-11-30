const fs = require('fs').promises;
const path = require('path');

/**
 * Ensure required directories exist
 */
async function ensureDirectories() {
  const dirs = [
    path.join(__dirname, '../data'),
    path.join(__dirname, '../cache'),
    path.join(__dirname, '../logs'),
    path.join(__dirname, '../docs')
  ];

  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory already exists or other error
    }
  }
}

/**
 * Clean phone number for display (remove @c.us suffix)
 */
function cleanPhoneNumber(phone) {
  return phone.replace('@c.us', '').replace('@s.whatsapp.net', '');
}

module.exports = {
  ensureDirectories,
  cleanPhoneNumber
};

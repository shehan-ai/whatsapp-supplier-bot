require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { handleMessage } = require('./src/messageHandler');
const { ensureDirectories } = require('./src/utils');
const { healthCheck } = require('./src/supplierManager');

console.log('🚀 Starting WhatsApp Supplier Finder Bot...');

// Ensure required directories exist
ensureDirectories().then(() => {
  console.log('✅ Directories initialized');
}).catch(err => {
  console.error('⚠️ Error creating directories:', err.message);
});

// Run database health check
healthCheck().catch(err => {
  console.error('⚠️ Health check error:', err.message);
});

console.log('🔧 Initializing WhatsApp client...');

// Initialize WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});
const initTimeout = setTimeout(() => {
  console.error('❌ ERROR: Client initialization timed out after 60 seconds!');
  console.error('❌ This usually means Chromium failed to launch.');
  console.error('💡 Try running: npm install puppeteer --force');
  process.exit(1);
}, 60000);


// QR Code event
client.on('qr', (qr) => {
  clearTimeout(initTimeout); // Clear timeout on success
  console.log('\n📱 Scan this QR code with WhatsApp:\n');
  qrcode.generate(qr, { small: true });
  console.log('\nOpen WhatsApp > Linked Devices > Link a Device\n');
});

// Ready event
client.on('ready', () => {
  clearTimeout(initTimeout); // Clear timeout on success
  console.log('✅ WhatsApp bot is ready!');
  console.log('📞 Listening for messages...\n');
});

// Authentication events
client.on('authenticated', () => {
  console.log('🔐 Authentication successful!');
});

client.on('auth_failure', (msg) => {
  console.error('❌ Authentication failed:', msg);
});

// Disconnected event
client.on('disconnected', (reason) => {
  console.log('⚠️ Client was disconnected:', reason);
});

// Loading event
client.on('loading_screen', (percent, message) => {
  console.log(`⏳ Loading: ${percent}% - ${message}`);
});

// Client error event
client.on('change_state', state => {
  console.log('🔄 State changed:', state);
});

// Message event
client.on('message', async (message) => {
  // Ignore groups, broadcasts, and status updates
  if (message.from.includes('@g.us') || message.from.includes('status') || message.from.includes('broadcast')) {
    return;
  }

  await handleMessage(message, client);
});

// Initialize the client
client.initialize();

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n⏹️ Shutting down bot...');
  await client.destroy();
  process.exit(0);
});

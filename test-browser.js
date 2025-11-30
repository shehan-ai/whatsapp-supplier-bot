const puppeteer = require('puppeteer');

(async () => {
  console.log('🧪 Testing raw Puppeteer launch...');
  
  try {
    console.log('🚀 Launching browser...');
    const browser = await puppeteer.launch({
      headless: false,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    console.log('✅ Browser launched successfully!');
    
    const page = await browser.newPage();
    console.log('📄 New page created');
    
    await page.goto('https://web.whatsapp.com');
    console.log('🌐 Navigated to WhatsApp Web');
    
    setTimeout(async () => {
      await browser.close();
      console.log('🔒 Browser closed');
    }, 5000);
    
  } catch (error) {
    console.error('❌ Error launching browser:', error);
  }
})();

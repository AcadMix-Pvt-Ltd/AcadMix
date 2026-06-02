const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Launching Browser Agent in non-headless mode...');
  
  try {
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: [
        '--start-maximized',
        '--use-fake-ui-for-media-stream' // Bypasses mic/cam permissions box in Chrome cleanly
      ]
    });

    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1440, height: 900 });

    // Enable console logs from page to terminal for debugging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

    console.log('🌐 Navigating to AcadMix Student Panel...');
    await page.goto('http://aits.localhost:3000/login', { waitUntil: 'networkidle2', timeout: 30000 });

    console.log('🔑 Logging in with Student credentials (Roll: 22A81A700002)...');
    
    // Wait for the inputs
    await page.waitForSelector('input[placeholder="Enter Roll Number or ID"]', { timeout: 10000 });
    await page.waitForSelector('input[placeholder="Enter Password"]', { timeout: 10000 });

    // Fill in credentials
    await page.type('input[placeholder="Enter Roll Number or ID"]', '22A81A700002');
    await page.type('input[placeholder="Enter Password"]', 'student123');

    console.log('🖱️ Clicking Sign In...');
    await page.click('button[type="submit"]');

    console.log('⏳ Waiting for dashboard navigation...');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 });

    console.log('✅ Logged in successfully! Landing on student dashboard.');
    console.log('Current URL:', page.url());

    // Wait a brief moment for the dashboard data to load
    await new Promise(res => setTimeout(res, 2000));

    console.log('🎯 Navigating to Placement Prep / Interview War Room...');
    
    // Find and click the stat card for Interview Prep
    const interviewPrepCardSelector = '[data-testid="stat-card-interview-prep"]';
    await page.waitForSelector(interviewPrepCardSelector, { timeout: 10000 });
    await page.click(interviewPrepCardSelector);

    console.log('⏳ Waiting for Interview War Room navigation...');
    await new Promise(res => setTimeout(res, 2500));
    console.log('Current URL:', page.url());

    console.log('🤖 Finding "Start Ami Mock Interview" button...');
    
    // Click the Start Ami Mock Interview button
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const startBtn = buttons.find(b => b.textContent.includes('Start Ami Mock Interview'));
      if (startBtn) {
        startBtn.click();
        console.log('Clicking Start Ami Mock Interview button.');
      } else {
        console.error('Could not find Start Ami Mock Interview button.');
      }
    });

    console.log('⏳ Waiting for Green Room Lobby to load...');
    await new Promise(res => setTimeout(res, 3000));
    console.log('Current URL:', page.url());
    console.log('🎉 Landed on the AI Mock Interview Session Setup Lobby.');

    console.log('⏳ Waiting for "Start Interview" button to become enabled...');
    // Poll/wait for the Start Interview button to be active
    await page.waitForFunction(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const startBtn = buttons.find(b => b.textContent.includes('Start Interview'));
      return startBtn && !startBtn.disabled;
    }, { timeout: 20000 });

    console.log('🖱️ Clicking "Start Interview" to launch mock interview session...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const startBtn = buttons.find(b => b.textContent.includes('Start Interview'));
      if (startBtn) {
        startBtn.click();
        console.log('Clicked Start Interview button successfully.');
      } else {
        console.error('Could not find Start Interview button.');
      }
    });

    console.log('⏳ Waiting for the active interview room/session to initialize...');
    await new Promise(res => setTimeout(res, 5000));
    console.log('Current URL:', page.url());
    console.log('🎉 Successfully launched the AI Mock Interview Session!');
    console.log('Leaving browser open. You are now inside the active mock interview room. Happy interviewing!');

  } catch (error) {
    console.error('❌ An error occurred during automation:', error);
  }
})();


const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

// Auto-detect Chrome on Windows (same as scout.js)
const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Users\\Algis\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
];
const CHROME_PATH = chromePaths.find(p => fs.existsSync(p));

if (!CHROME_PATH) {
    console.error("❌ Chrome not found in standard locations.");
    process.exit(1);
}

(async () => {
    console.log("🕵️‍♂️ Debugging Kakava.lt...");

    let browser;
    try {
        browser = await puppeteer.launch({
            executablePath: CHROME_PATH,
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();

        // Mock User-Agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        const url = "https://kakava.lt/renginiai-vilniuje";
        console.log(`🌍 Visiting ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        const selector = "a.event-card";

        try {
            await page.waitForSelector(selector, { timeout: 10000 });
        } catch (e) {
            console.log("Selector not found or timeout.");
        }

        const rawEvents = await page.evaluate((sel) => {
            const items = document.querySelectorAll(sel);
            const data = [];
            items.forEach((item, index) => {
                if (index < 5) { // Just first 5
                    data.push({
                        html: item.outerHTML,
                        text: item.innerText,
                        lines: item.innerText.split('\n').map(l => l.trim()).filter(l => l)
                    });
                }
            });
            return data;
        }, selector);

        console.log(`✨ Found ${rawEvents.length} first cards.`);

        rawEvents.forEach((ev, i) => {
            console.log(`\n--- Card ${i + 1} ---`);
            console.log("RAW TEXT BLOCK:\n", ev.text);
            console.log("PARSED LINES:", ev.lines);
        });

    } catch (err) {
        console.error("❌ Error:", err);
    } finally {
        if (browser) await browser.close();
    }
})();

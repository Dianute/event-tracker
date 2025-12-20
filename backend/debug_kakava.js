
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

        const url = "https://kakava.lt/renginiai";
        console.log(`🌍 Visiting ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Try multiple selectors
        // const potentialSelectors = ["a.event-card", "a[href*='/renginys/']", ".card", "div[class*='event']"];
        // let selector = potentialSelectors[0];

        // Check page title and body content for login wall
        const pageTitle = await page.title();
        console.log("Page Title:", pageTitle);

        const rawEvents = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a'));

            // Filter for event links
            const eventLinks = anchors.filter(a => a.href.includes('/renginys/'));

            if (eventLinks.length === 0) {
                return {
                    found: false,
                    html: document.body.innerHTML.substring(0, 5000),
                    text: document.body.innerText.substring(0, 2000)
                };
            }

            const data = eventLinks.slice(0, 5).map(a => ({
                selector: "Derived from Link",
                text: a.innerText,
                href: a.href,
                className: a.className,
                outerHTML: a.outerHTML.substring(0, 200)
            }));

            return { found: true, data };
        });

        if (rawEvents.found) {
            console.log(`✨ Found ${rawEvents.data.length} first cards using selector: ${rawEvents.data[0].selector}`);
            rawEvents.data.forEach((ev, i) => {
                console.log(`\n--- Card ${i + 1} ---`);
                console.log("TEXT:", ev.text);
                console.log("LINK:", ev.href);
            });
        } else {
            console.log("❌ No events found.");
            console.log("PAGE TEXT SNAPSHOT:\n", rawEvents.text);
            console.log("DUMPING HTML START:\n", rawEvents.html);
            console.log("DUMPING HTML END");
        }

    } catch (err) {
        console.error("❌ Error:", err);
    } finally {
        if (browser) await browser.close();
    }
})();

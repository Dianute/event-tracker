const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const fs = require('fs');

(async () => {
    console.log("🕵️‍♂️ Debugging Bilietai.lt...");

    // Find local Chrome
    const paths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Users\\Algis\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
    ];
    const executablePath = paths.find(p => fs.existsSync(p));

    if (!executablePath) {
        throw new Error("Could not find Chrome on this machine. Please install Google Chrome.");
    }

    // Launch browser
    const browser = await puppeteer.launch({
        executablePath: executablePath,
        headless: "new",
    });

    const page = await browser.newPage();

    // Fake User-Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
        console.log("🌍 Navigating to Bilietai.lt...");
        await page.goto('https://www.bilietai.lt/lit/renginiai/koncertai/', { waitUntil: 'networkidle2', timeout: 60000 });

        console.log("📸 Saving HTML snapshot...");
        const html = await page.content();
        fs.writeFileSync('bilietai_dump.html', html);
        console.log("✅ HTML saved to bilietai_dump.html");

        // Try to find generic links to confirm page loaded content
        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a')).slice(0, 10).map(a => a.href);
        });
        console.log("🔗 First 10 links found:", links);

    } catch (e) {
        console.error("❌ Error:", e.message);
    } finally {
        await browser.close();
    }
})();

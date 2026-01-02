const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
    // Locate Chrome on Windows
    const chromePaths = [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe" // Fallback to Edge
    ];
    const executablePath = chromePaths.find(p => fs.existsSync(p));

    if (!executablePath) {
        console.error("❌ Could not find Chrome or Edge executable.");
        return;
    }

    console.log(`Using Browser: ${executablePath}`);

    // 1. Setup Browser
    const browser = await puppeteer.launch({
        executablePath,
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 2. Target a specific Kakava Event (User logic implies list first)
    // We'll scrape the LIST first to get a link, then DEEP SCRAPE that link.
    const url = 'https://kakava.lt/renginiai/klaipeda';
    console.log(`Navigating to list: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2' });

    // 3. Get First Event Link
    const firstLink = await page.evaluate(() => {
        const item = document.querySelector('a.c-card'); // Try standard
        if (item) return item.href;
        const fallback = document.querySelector("a[href*='/renginys/']");
        return fallback ? fallback.href : null;
    });

    if (!firstLink) {
        console.error("❌ Could not find ANY event link on list page.");
        await page.screenshot({ path: 'debug_kakava_list.png' });

        // Dump all links
        const links = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(a => a.href));
        console.log("Found Links:", links.slice(0, 10)); // Show text

        await browser.close();
        return;
    }

    console.log(`🔗 Found Event Link: ${firstLink}`);

    // 4. Deep Scrape It
    console.log("------------------------------------------------");
    console.log("🕵️‍♂️ DEEP SCRAPING...");
    await page.goto(firstLink, { waitUntil: 'domcontentloaded' });

    // 5. Dump JSON-LD
    const ldData = await page.evaluate(() => {
        const script = document.querySelector('script[type="application/ld+json"]');
        return script ? JSON.parse(script.innerText) : null;
    });

    console.log("📜 JSON-LD DATA:");
    console.log(JSON.stringify(ldData, null, 2));

    // 6. Test Body Text Fallback
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
    console.log("📄 BODY TEXT (First 500 chars):");
    console.log(bodyText);

    await browser.close();
})();

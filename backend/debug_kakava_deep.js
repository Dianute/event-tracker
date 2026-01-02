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
    const url = 'https://kakava.lt/renginiai/klaipeda/visi';
    console.log(`Navigating to list: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

    // Explicit Wait for Rendering
    console.log("⏳ Waiting 6s for hydration...");
    await new Promise(r => setTimeout(r, 6000));

    // 3. Inspect List Items (New Broad Selector)
    console.log("🕵️‍♂️ Inspecting List Items with: a[href*='/renginys/']");
    const foundItems = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll("a[href*='/renginys/']"));
        return items.map(a => ({
            text: a.innerText.replace(/\n/g, ' | ').substring(0, 100), // Serialize text
            href: a.href,
            class: a.className
        }));
    });

    console.log(`Found ${foundItems.length} potential items.`);
    foundItems.slice(0, 10).forEach((item, i) => {
        console.log(`[${i}] Text: "${item.text}" | Link: ${item.href.slice(-30)}`);
    });

    // 4. Test Deep Scrape on the FIRST meaningful item (length > 10)
    const validItem = foundItems.find(i => i.text.length > 10);

    if (!validItem) {
        console.error("❌ No items with sufficient text found.");
        const htmlDump = await page.evaluate(() => `Title: ${document.title}\nBody: ${document.body.innerText.slice(0, 500)}`);
        console.log("📄 PAGE DUMP:\n" + htmlDump);

        await browser.close();
        return;
    }

    console.log("------------------------------------------------");
    console.log(`🕵️‍♂️ DEEP SCRAPING Target: ${validItem.href}`);
    await page.goto(validItem.href, { waitUntil: 'networkidle0', timeout: 60000 });

    console.log("⏳ Waiting 6s for Detail Page hydration...");
    await new Promise(r => setTimeout(r, 6000));

    // 5. Dump JSON-LD
    const ldData = await page.evaluate(() => {
        const script = document.querySelector('script[type="application/ld+json"]');
        return script ? JSON.parse(script.innerText) : null;
    });

    console.log("📜 JSON-LD DATA:");
    console.log(JSON.stringify(ldData, null, 2));

    // 6. Dump Meta Tags (Open Graph)
    const metaData = await page.evaluate(() => {
        const getMeta = (name) => document.querySelector(`meta[property="${name}"]`)?.content || document.querySelector(`meta[name="${name}"]`)?.content || null;
        return {
            title: getMeta('og:title'),
            description: getMeta('og:description'),
            image: getMeta('og:image'),
            url: getMeta('og:url'),
            site_name: getMeta('og:site_name')
        };
    });
    console.log("🏷️ META DATA:", metaData);

    await browser.close();
})();


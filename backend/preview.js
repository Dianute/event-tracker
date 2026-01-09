const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const fs = require('fs');

async function scrapePreview(url) {
    // 1. Setup Browser
    const chromePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Users\\Algis\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
    ];
    let executablePath = null;
    if (process.platform === 'win32') {
        executablePath = chromePaths.find(p => fs.existsSync(p));
    } else {
        executablePath = await chromium.executablePath();
    }

    const browser = await puppeteer.launch({
        args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: chromium.defaultViewport,
        executablePath: executablePath || await chromium.executablePath(),
        headless: "new",
        ignoreDefaultArgs: ['--disable-extensions'],
    });

    try {
        const page = await browser.newPage();

        // Block images/fonts for speed
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font'].includes(req.resourceType())) req.abort().catch(() => { });
            else req.continue().catch(() => { });
        });

        // Set User Agent to look like a real browser (Facebook hates bots)
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.error(`Visiting ${url}...`); // Use stderr for logs, stdout for JSON
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Wait a bit for dynamic content (Facebook requires it)
        await new Promise(r => setTimeout(r, 3000));

        // 2. Extract Metadata (Open Graph)
        const meta = await page.evaluate(() => {
            const getMeta = (prop) => {
                const tag = document.querySelector(`meta[property="${prop}"]`) || document.querySelector(`meta[name="${prop}"]`);
                return tag ? tag.content : null;
            };
            return {
                title: getMeta('og:title') || document.title,
                description: getMeta('og:description') || "",
                image: getMeta('og:image'),
                url: getMeta('og:url') || window.location.href,
                siteName: getMeta('og:site_name'),
                bodyText: document.body.innerText
            };
        });

        // 3. Smart Extraction (NLP)
        const text = meta.bodyText || "";
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);

        // --- Date Extraction ---
        // Lithuanian Months Regex
        const dateRegex = /(?:(\d{1,2})\s+)?(sausio|vasario|kovo|balandžio|gegužės|birželio|liepos|rugpjūčio|rugsėjo|spalio|lapkričio|gruodžio)(?:\s+(\d{1,2}))?(?:\s+d\.)?/i;

        let dateRaw = "";
        const lower = text.toLowerCase();

        // Special Keywords
        if (lower.includes('šiandien')) dateRaw = new Date().toISOString().split('T')[0];
        else if (lower.includes('rytoj')) {
            const d = new Date();
            d.setDate(d.getDate() + 1);
            dateRaw = d.toISOString().split('T')[0];
        }

        // Scan Lines for Date
        if (!dateRaw) {
            for (const line of lines) {
                const match = line.match(dateRegex);
                if (match) {
                    dateRaw = match[0];
                    // Append Year if missing
                    if (!dateRaw.match(/\d{4}/)) dateRaw += ` ${new Date().getFullYear()}`;
                    break;
                }
            }
        }

        // --- Time Extraction ---
        // Look for HH:MM pattern
        const timeRegex = /(\d{1,2})[:.](\d{2})(?:\s*(?:val\.?|h))?/i;
        let timeRaw = "12:00"; // Default
        for (const line of lines) {
            const match = line.match(timeRegex);
            if (match) {
                // Validate hours
                const h = parseInt(match[1]);
                if (h >= 0 && h <= 23) {
                    timeRaw = `${match[1].padStart(2, '0')}:${match[2]}`;
                    break;
                }
            }
        }

        // --- Venue Extraction ---
        // Heuristic: Facebook often puts location in specific spans or near "at"
        // For now, we reuse the Location logic or default to Page Name if it looks like a place
        let venue = meta.siteName || "Unknown Location";

        // Clean result
        const result = {
            title: meta.title.replace(' | Facebook', '').trim(),
            description: meta.description,
            imageUrl: meta.image,
            dateRaw: dateRaw,
            timeRaw: timeRaw,
            location: venue, // User will likely edit this
            sourceUrl: url
        };

        // Output JSON to stdout
        console.log(JSON.stringify(result));

    } catch (err) {
        console.error("Scrape Error:", err.message);
        // Return empty JSON on failure
        console.log(JSON.stringify({ error: err.message }));
    } finally {
        await browser.close();
    }
}

const targetUrl = process.argv[2];
if (!targetUrl) {
    console.error("Please provide a URL");
    process.exit(1);
}

scrapePreview(targetUrl);

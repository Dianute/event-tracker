const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:8080/events';

async function runScout() {
    console.log("🕵️‍♂️ Scout Agent Starting (Puppeteer Mode)...");

    // Read targets from JSON
    let targets = [];
    try {
        const data = fs.readFileSync(path.join(__dirname, 'targets.json'), 'utf8');
        targets = JSON.parse(data);
    } catch (e) {
        console.log("⚠️ No targets.json found, using defaults.");
        targets = [{ name: "Default", url: "https://www.bandsintown.com/c/klaipeda-lithuania", selector: "a[href*='/e/']" }];
    }

    // Helper to find local Chrome on Windows
    const chromePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Users\\Algis\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
    ];
    let executablePath = null;

    // Check if we are on Windows (local dev) or Linux (Production)
    if (process.platform === 'win32') {
        executablePath = chromePaths.find(p => fs.existsSync(p));
        if (!executablePath) console.warn("⚠️ Local Chrome not found, trying default Puppeteer bundle...");
    } else {
        // Production (Railway/Linux)
        executablePath = await chromium.executablePath();
    }

    const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: executablePath || await chromium.executablePath(),
        headless: "new", // Force new headless mode
        ignoreDefaultArgs: ['--disable-extensions'],
    });

    try {
        for (const target of targets) {
            console.log(`🌍 Visiting: ${target.name} (${target.url})`);
            const page = await browser.newPage();
            // Set User-Agent to avoid bot detection
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            try {
                await page.goto(target.url, { waitUntil: 'networkidle2', timeout: 45000 });

                // Inject selector into browser context
                const selector = target.selector || "a[href*='/e/']";

                // Extract raw data strings first
                const rawEvents = await page.evaluate((sel) => {
                    const found = [];
                    const items = document.querySelectorAll(sel);

                    items.forEach((item, index) => {
                        if (index > 15) return; // Limit to 15 events
                        const rawText = item.innerText;
                        const link = item.href;

                        if (rawText && rawText.length > 10) {
                            found.push({ rawText, link });
                        }
                    });
                    return found;
                }, selector);

                console.log(`✨ Extracted ${rawEvents.length} raw cards. Processing...`);

                const events = [];
                for (const raw of rawEvents) {
                    try {
                        const parsed = parseEventText(raw.rawText);

                        // Geocode the location
                        let coords = { lat: 0, lng: 0 };
                        if (parsed.location) {
                            const geo = await geocodeAddress(parsed.location);
                            if (geo) {
                                coords = { lat: parseFloat(geo.lat), lng: parseFloat(geo.lon) };
                            } else {
                                // Fallback: Random scatter around a default center (Kaunas-ish)
                                coords = {
                                    lat: 54.8985 + (Math.random() * 0.05 - 0.025),
                                    lng: 23.9036 + (Math.random() * 0.05 - 0.025)
                                };
                            }
                        }

                        events.push({
                            title: parsed.title,
                            venue: parsed.location,
                            date: parsed.dateRaw,
                            link: raw.link,
                            description: `Event from ${target.name}`,
                            type: "music", // Default
                            lat: coords.lat,
                            lng: coords.lng,
                            startTime: new Date().toISOString() // TODO: Parse real date
                        });

                        // Rate limit for Nominatim
                        await new Promise(r => setTimeout(r, 1100));

                    } catch (err) {
                        console.warn("Skipping event due to parse error:", err.message);
                    }
                }

                if (events.length > 0) {
                    console.log(`✨ Successfully parsed and geocoded ${events.length} events!`);
                    for (const ev of events) {
                        await axios.post('http://localhost:8080/events', ev);
                    }
                } else {
                    console.log("⚠️ No events found after parsing.");
                }

            } catch (err) {
                console.error(`❌ Error scraping ${target.name}: ${err.message}`);
            }
            await page.close();
        }

    } finally {
        await browser.close();
        console.log("✅ Scout Mission Complete.");
    }
}

// --- Helpers ---

function parseEventText(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    // 1. Identify Price/Status (Bottom line usually)
    let priceIndex = -1;
    const priceKeywords = ['€', 'Eur', 'Kaina', 'Išparduota', 'Nemokamai'];
    for (let i = lines.length - 1; i >= 0; i--) {
        if (priceKeywords.some(kw => lines[i].includes(kw))) {
            priceIndex = i;
            break;
        }
    }

    // Default to last line if no price found
    if (priceIndex === -1) priceIndex = lines.length - 1;

    // 2. Identify Structure based on Bilietai/Kakava patterns
    // Bilietai Pattern: [Date Parts..., Venue, Title, Price]
    // Kakava Pattern: [Title, Date, Venue, Price] (Often)

    // Heuristic: Title is usually the longest line or emphatically styled (not detectable here)
    // Heuristic: Venue is usually below Date and above Title (Bilietai) OR below Title (Kakava)

    let title = "Unknown Title";
    let venue = "Unknown Venue";
    let dateRaw = "";

    // If we have enough lines
    if (lines.length >= 3) {
        const candidate1 = lines[priceIndex - 1]; // Line above price
        const candidate2 = lines[priceIndex - 2]; // Line above that

        // Check if candidate 2 looks like a venue (simple heuristic)
        // If candidate 1 is the Title, then candidate 2 might be Venue

        title = candidate1;
        venue = candidate2;

        // Date is everything before the venue
        dateRaw = lines.slice(0, priceIndex - 2).join(' ');
    } else {
        // Fallback for short cards
        title = lines[0] || "Unknown";
        dateRaw = lines.slice(1).join(' ');
    }

    return { title, location: venue, dateRaw };
}

async function geocodeAddress(address) {
    // Clean address
    const cleanAddr = address.trim();
    if (!cleanAddr) return null;

    // Append 'Lithuania' for context if not present
    const query = cleanAddr.includes('Lietuva') ? cleanAddr : `${cleanAddr}, Lietuva`;

    try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'EventTrackerAntigravity/1.0 (contact@antigravity.dev)',
                'Referer': 'http://localhost'
            }
        });
        if (res.data && res.data.length > 0) {
            return res.data[0];
        }
    } catch (e) {
        // Ignore errors
    }
    return null;
}

async function runSimulation() {
    // Only run if real scraping fails
    const SIMULATED_EVENTS = [
        {
            title: "Simulated: Jazz Night",
            description: "Scraping fallback event",
            type: "music",
            lat: 55.7068,
            lng: 21.1258,
            startTime: new Date(Date.now() + 86400000).toISOString()
        }
    ];
    for (const event of SIMULATED_EVENTS) {
        await axios.post(API_URL, event);
        console.log(`✨ Discovered (Sim): ${event.title}`);
    }
}

runScout();

const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // Ensure this is installed or use crypto
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;
const API_URL = `http://localhost:${PORT}`;
const RUN_ID = crypto.randomUUID();

// Main Execution
async function runScout() {
    console.log(`🕵️‍♂️ Scout Agent Starting (Run ID: ${RUN_ID})...`);

    // Log Start
    try {
        await axios.post(`${API_URL}/scout/log`, { id: RUN_ID, status: 'RUNNING' });
    } catch (e) {
        console.error("⚠️ Failed to log start:", e.message);
    }

    // Check CLI arguments for single-target mode
    const args = process.argv.slice(2);
    let customUrl = null;
    if (args.length > 0 && args[0].startsWith('--url=')) {
        customUrl = args[0].split('=')[1];
    }

    // Read targets
    let targets = [];
    if (customUrl) {
        console.log(`🎯 Single-Target Mode: ${customUrl}`);
        // Auto-detect selector
        let selector = "a[href*='/e/']"; // Default
        if (customUrl.includes('bilietai.lt')) selector = ".event_short";
        else if (customUrl.includes('kakava.lt')) selector = "a.event-card"; // Kakava specific
        else if (customUrl.includes('bandsintown')) selector = "a[href*='/e/']";

        targets = [{ name: "Custom Target", url: customUrl, selector: selector }];
    } else {
        try {
            const data = fs.readFileSync(path.join(__dirname, 'targets.json'), 'utf8');
            targets = JSON.parse(data);
        } catch (e) {
            console.log("⚠️ No targets.json found, using defaults.");
            targets = [{ name: "Default", url: "https://www.bandsintown.com/c/klaipeda-lithuania", selector: "a[href*='/e/']" }];
        }
    }

    // Chrome Path Detection
    const chromePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Users\\Algis\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
    ];
    let executablePath = null;
    if (process.platform === 'win32') {
        executablePath = chromePaths.find(p => fs.existsSync(p));
        if (!executablePath) console.warn("⚠️ Local Chrome not found, trying default Puppeteer bundle...");
    } else {
        executablePath = await chromium.executablePath();
    }

    const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: executablePath || await chromium.executablePath(),
        headless: "new",
        ignoreDefaultArgs: ['--disable-extensions'],
    });

    let totalEventsFound = 0;

    try {
        for (const target of targets) {
            console.log(`🌍 Visiting: ${target.name} (${target.url})`);
            const page = await browser.newPage();
            try {
                await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
                await page.goto(target.url, { waitUntil: 'networkidle2', timeout: 45000 });

                const selector = target.selector || "a[href*='/e/']";

                // Extract raw data
                const rawEvents = await page.evaluate((sel) => {
                    const found = [];
                    const items = document.querySelectorAll(sel);
                    items.forEach((item, index) => {
                        if (index > 15) return;
                        const rawText = item.innerText;
                        const link = item.href;
                        if (rawText && rawText.length > 10) found.push({ rawText, link });
                    });
                    return found;
                }, selector);

                console.log(`✨ Extracted ${rawEvents.length} raw cards from ${target.name}.`);

                const events = [];
                for (const raw of rawEvents) {
                    try {
                        const parsed = parseEventText(raw.rawText);
                        let coords = { lat: 0, lng: 0 };
                        if (parsed.location) {
                            // Smart City Logic: Use detected city from text, fallback to target default
                            const cityContext = parsed.detectedCity || target.city;

                            const geo = await geocodeAddress(parsed.location, cityContext);
                            if (geo) {
                                coords = { lat: parseFloat(geo.lat), lng: parseFloat(geo.lon) };
                                console.log(`   📍 Geocoded: ${parsed.location} (${cityContext || 'No City'}) -> [${geo.lat}, ${geo.lon}]`);
                            } else {
                                console.warn(`   ⚠️ Geocode Failed: ${parsed.location} (using fallback)`);
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
                            type: "music",
                            lat: coords.lat,
                            lng: coords.lng,
                            startTime: new Date().toISOString()
                        });

                        await new Promise(r => setTimeout(r, 1100)); // Rate limit
                    } catch (err) {
                        console.warn("Skipping event:", err.message);
                    }
                }

                if (events.length > 0) {
                    console.log(`✨ Parsed ${events.length} events. uploading...`);
                    for (const ev of events) {
                        await axios.post(`${API_URL}/events`, ev);
                    }
                    totalEventsFound += events.length;
                }

            } catch (err) {
                console.error(`❌ Error scraping ${target.name}: ${err.message}`);
            } finally {
                await page.close();
            }
        }

        // Log SUCCESS
        await axios.post(`${API_URL}/scout/log`, {
            id: RUN_ID,
            status: 'SUCCESS',
            eventsFound: totalEventsFound,
            endTime: new Date().toISOString()
        });

    } catch (err) {
        console.error(`❌ Fatal Error: ${err.message}`);
        // Log FAILURE
        await axios.post(`${API_URL}/scout/log`, {
            id: RUN_ID,
            status: 'FAILED',
            logSummary: err.message,
            endTime: new Date().toISOString()
        });
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

    // 3. Smart City Detection
    const LITHUANIAN_CITIES = [
        "Vilnius", "Kaunas", "Klaipėda", "Šiauliai", "Panevėžys",
        "Alytus", "Marijampolė", "Mažeikiai", "Jonava", "Utena",
        "Kėdainiai", "Telšiai", "Visaginas", "Tauragė", "Ukmergė",
        "Palanga", "Druskininkai", "Birštonas", "Trakai", "Neringa"
    ];

    let detectedCity = null;
    const fullText = text.toLowerCase();

    // Check line by line specifically for city names
    for (const city of LITHUANIAN_CITIES) {
        if (fullText.includes(city.toLowerCase())) {
            detectedCity = city;
            break; // Found primary city
        }
    }

    return { title, location: venue, dateRaw, detectedCity };
}

async function geocodeAddress(address, defaultCity = "") {
    // Clean address
    let cleanAddr = address.trim();
    if (!cleanAddr) return null;

    // Append default city if not present in address
    if (defaultCity && !cleanAddr.toLowerCase().includes(defaultCity.toLowerCase())) {
        cleanAddr = `${cleanAddr}, ${defaultCity}`;
    }

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

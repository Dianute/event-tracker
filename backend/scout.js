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

                // Detect if Facebook
                const isFacebook = target.url.includes('facebook.com');
                let selector = target.selector || "a[href*='/e/']";

                if (isFacebook) {
                    // Facebook Strategy: Look for Posts
                    selector = 'div[role="article"]';
                    console.log(`🕵️‍♂️ Facebook detected. Hunting for posts with selector: ${selector}`);

                    // Specific anti-login-wall scrolling
                    try {
                        await page.keyboard.press('Escape'); // Close popups
                        await page.mouse.wheel({ deltaY: 2000 });
                        await new Promise(r => setTimeout(r, 2000));
                    } catch (e) { }
                }

                // Wait for content
                try {
                    await page.waitForSelector(selector, { timeout: 10000 });
                } catch (e) {
                    console.log(`⚠️ Selector ${selector} not found (might be login wall or empty).`);
                }

                // Extract raw data
                const rawEvents = await page.evaluate((sel, isFb) => {
                    const found = [];
                    const items = document.querySelectorAll(sel);
                    items.forEach((item, index) => {
                        // if (index > 15) return; // Removed limit
                        const rawText = item.innerText;
                        // For Facebook, link is tricky. Often valid link is in a timestamp or the post itself.
                        // We try to find the first anchor.
                        const link = isFb ? (item.querySelector('a')?.href || window.location.href) : item.href;

                        // Facebook posts are long, length check > 10 is fine.
                        if (rawText && rawText.length > 10) found.push({ rawText, link });
                    });
                    return found;
                }, selector, isFacebook);

                console.log(`✨ Extracted ${rawEvents.length} raw cards from ${target.name}.`);

                const events = [];
                for (const raw of rawEvents) {
                    try {
                        let parsed;
                        if (isFacebook) {
                            parsed = parseFacebookPost(raw.rawText);
                            if (!parsed.dateRaw) {
                                // console.log("Skipping FB post (no date found):", parsed.title.substring(0, 50) + "...");
                                continue;
                            }
                        } else if (target.url.includes('kakava.lt')) {
                            parsed = parseKakavaEvent(raw.rawText);
                        } else {
                            parsed = parseEventText(raw.rawText);
                        }
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

                        // Calculate Real Start Time
                        const startTime = parseLithuanianDate(parsed.dateRaw, parsed.timeRaw || "19:00");
                        // End time = Start + 3 hours (approximation)
                        const endTime = new Date(startTime.getTime() + 3 * 60 * 60 * 1000);

                        events.push({
                            title: parsed.title,
                            venue: parsed.location,
                            date: parsed.dateRaw,
                            link: raw.link,
                            description: `Event from ${target.name}\n${parsed.location}\n${parsed.dateRaw} @ ${parsed.timeRaw || "19:00"}`,
                            type: "music",
                            lat: coords.lat,
                            lng: coords.lng,
                            startTime: startTime.toISOString(),
                            endTime: endTime.toISOString()
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
    // Split and clean lines
    let lines = text.split('\n').map(l => l.trim()).filter(l => l);

    // Filter out common UI noise lines "Pirkti bilietą", prices, etc.
    const noise = ['Pirkti bilietą', 'Osta pilet', 'Buy ticket', '€', 'Eur', 'Kaina'];
    // We keep lines that might be Title/Venue but try to skip obvious buttons at the very start
    if (lines.length > 0 && noise.some(n => lines[0].includes(n))) {
        lines.shift();
    }

    if (lines.length === 0) return { title: "Unknown", location: "Unknown", dateRaw: "" };

    // Bilietai/Kakava Typical Structure (Visual Order):
    // [Title]
    // [Tags - Optional]
    // [Date]
    // [Venue]

    // Default strategy: Bottom-Up for Location/Date, Top-Down for Title

    // 1. Venue is usually the LAST line
    let venue = lines[lines.length - 1];

    // 2. Date is usually the 2ND TO LAST line
    let dateRaw = lines.length > 1 ? lines[lines.length - 2] : "";

    // 3. Title is usually the FIRST line (after filtering noise)
    let title = lines[0];

    // Validation Heuristics
    // If Date line doesn't look like a date (e.g. doesn't have digits), maybe structure is different?
    // But for now, this simple logic matches the observed Bilietai logs perfectly.

    // Cleanup Title (sometimes has extra spaces or pipes)
    if (title && title.includes('|')) {
        // "Artist | Venue" -> sometimes title repeats venue
        // Keep it all for now or split? Keep it.
    }

    // Smart City Detection (moved here from original parseEventText)
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

    const timeRaw = extractTime(text);
    return { title, location: venue, dateRaw, detectedCity, timeRaw };
}

function parseKakavaEvent(text) {
    let lines = text.split('\n').map(l => l.trim()).filter(l => l);

    // Filter noise
    // "Kaina nuo..." is usually the last line or close to it
    lines = lines.filter(l => !l.startsWith('Kaina nuo') && !l.includes('Atšaukta') && !l.includes('Išparduota'));

    if (lines.length === 0) return { title: "Unknown Kakava", location: "Unknown", dateRaw: "" };

    // Structure: [Date Lines...] -> [Title] -> [Venue]

    // 1. Extract Date
    // Check if first lines look like date parts (Month Short + Day)
    // Months: Lap, Sau, Vas, Kov, Bal, Geg, Bir, Lie, Rgp, Rgs, Spa, Gruod
    const months = ['saus', 'vas', 'kov', 'bal', 'geg', 'bir', 'lie', 'rgp', 'rgs', 'spa', 'lap', 'gruo'];

    let dateRaw = "";
    let titleIndex = 0;

    // Check line 0 for month
    if (lines.length > 1 && months.some(m => lines[0].toLowerCase().includes(m)) && lines[1].match(/^\d+$/)) {
        // Standard Date: "Lap" "19"
        dateRaw = `${lines[0]} ${lines[1]}`;
        titleIndex = 2;

        // Check for range: "Lap" "19" "|" "Gruod" "31"
        if (lines[2] === '|' && lines.length > 4) {
            dateRaw += ` - ${lines[3]} ${lines[4]}`;
            titleIndex = 5;
        }
    } else {
        // No date found at top (e.g. Card 1/2) -> Default or Search?
        // Let's assume lines[0] is Title then.
        dateRaw = "";
    }

    // 2. Title
    let title = lines[titleIndex] || "Unknown Title";

    // 3. Venue
    let venue = lines[titleIndex + 1] || "Unknown Venue";

    const timeRaw = extractTime(text);
    return { title, location: venue, dateRaw, detectedCity, timeRaw };
}

function parseFacebookPost(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    // Facebook posts are unstructured. We look for keywords.

    // 1. Date Extraction (Regex for Lithuanian months)
    // Matches: "Sausio 15", "Vasario 2 d.", "2025-12-15"
    const dateRegex = /(?:(\d{1,2})\s+)?(sausio|vasario|kovo|balandžio|gegužės|birželio|liepos|rugpjūčio|rugsėjo|spalio|lapkričio|gruodžio)(?:\s+(\d{1,2}))?(?:\s+d\.)?/i;

    let dateRaw = "";

    // 0. Keyword Heuristics for special dates
    const lower = text.toLowerCase();
    if (lower.includes('naujuosius metus') || lower.includes('naujieji metai')) {
        dateRaw = `${new Date().getFullYear()}-12-31`;
    } else if (lower.includes('šiandien')) {
        dateRaw = new Date().toISOString().split('T')[0];
    } else if (lower.includes('rytoj')) {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        dateRaw = d.toISOString().split('T')[0];
    }

    // Scan matching lines
    for (const line of lines) {
        const match = line.match(dateRegex);
        if (match) {
            // Found a date-like string
            dateRaw = match[0];
            // Add year if missing (assume next occurrence)
            if (!dateRaw.match(/\d{4}/)) {
                dateRaw += ` ${new Date().getFullYear()}`; // Naive assumption
            }
            break;
        }
    }

    // 2. Title - Assume first line that isn't date/meta
    let title = lines[0] || "Unknown Facebook Post";
    if (title.length < 5 && lines.length > 1) title = lines[1]; // Skip short noise

    // 3. Venue - Search for "at ..." or just assume "Facebook Event"
    let venue = "Facebook Event"; // Default

    const timeRaw = extractTime(text);
    return { title, location: venue, dateRaw, detectedCity: null, timeRaw };
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

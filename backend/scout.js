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

    // Parse Args First
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run');

    // Helper for live updates
    const updateLog = async (status, summary = "", eventsCount = null) => {
        if (isDryRun) return; // Silent mode for tests
        try {
            const body = { id: RUN_ID, status, logSummary: summary };
            if (eventsCount !== null) body.eventsFound = eventsCount;
            await axios.post(`${API_URL}/scout/log`, body);
        } catch (e) { console.error("⚠️ Log update failed:", e.message); }
    };

    // Log Start
    await updateLog('RUNNING', 'Initializing Scout Agent...');

    // Read targets logic (moved up for logging)
    let targets = [];
    let customUrl = null;

    if (args.length > 0) {
        const urlArg = args.find(a => a.startsWith('--url='));
        if (urlArg) customUrl = urlArg.split('=')[1];
    }

    if (customUrl) {
        // ... custom logic ...
        let selector = "a[href*='/e/']";
        if (customUrl.includes('bilietai.lt')) selector = ".event_short";
        else if (customUrl.includes('kakava.lt')) selector = "a.event-card";
        else selector = "a[href*='/e/']";
        targets = [{ name: "Custom Target", url: customUrl, selector: selector }];
    } else {
        try {
            const data = fs.readFileSync(path.join(__dirname, 'targets.json'), 'utf8');
            targets = JSON.parse(data);
        } catch (e) {
            targets = []; // Default handled below if empty
        }
    }

    if (targets.length === 0) targets = [{ name: "Default", url: "https://www.bandsintown.com/c/klaipeda-lithuania", selector: "a[href*='/e/']" }];

    const targetNames = targets.map(t => t.name).join(', ');
    await updateLog('RUNNING', `Starting scan for ${targets.length} targets: ${targetNames}`);

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

    loadCache(); // Load cache at start
    let totalEventsFound = 0;

    try {
        for (const target of targets) {
            console.log(`🌍 Visiting: ${target.name} (${target.url})`);
            let targetEventsFound = 0; // Track count for this specific target
            await updateLog('RUNNING', `Scanning ${target.name}...`, totalEventsFound);

            const page = await browser.newPage();
            try {
                await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
                await page.goto(target.url, { waitUntil: 'networkidle2', timeout: 45000 });

                // Detect if Facebook
                const isFacebook = target.url.includes('facebook.com');
                let selector = target.selector;

                // Auto-determine selector if missing
                if (!selector) {
                    if (target.url.includes('bilietai.lt')) selector = ".event_short";
                    else if (target.url.includes('kakava.lt')) selector = "a.event-card";
                    else selector = "a[href*='/e/']"; // BandsInTown default
                }

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

                // Smart Fallback for Kakava
                if (rawEvents.length === 0 && target.url.includes('kakava.lt') && !selector.includes('renginys')) {
                    console.log("⚠️ Standard selector failed for Kakava. Trying fallback: a[href*='/renginys/']");
                    const fallbackEvents = await page.evaluate(() => {
                        const found = [];
                        const items = document.querySelectorAll("a[href*='/renginys/']");
                        items.forEach((item) => {
                            const rawText = item.innerText;
                            if (rawText && rawText.length > 10) found.push({ rawText, link: item.href });
                        });
                        return found;
                    });
                    if (fallbackEvents.length > 0) {
                        console.log(`✨ Fallback success! Found ${fallbackEvents.length} events.`);
                        rawEvents.push(...fallbackEvents);
                    }
                }

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
                        let wasCached = false; // Track cache hit

                        if (parsed.location) {
                            // Smart City Logic: Use detected city from text, fallback to target default
                            const cityContext = parsed.detectedCity || target.city;

                            const geoStart = Date.now();
                            const geo = await geocodeAddress(parsed.location, cityContext);
                            const geoDuration = Date.now() - geoStart;

                            if (geoDuration < 100) wasCached = true; // Heuristic: Cache is fast

                            if (geo) {
                                coords = { lat: parseFloat(geo.lat), lng: parseFloat(geo.lon) };
                                console.log(`   📍 Geocoded: ${parsed.location} (${cityContext || 'No City'}) -> [${geo.lat}, ${geo.lon}] ${wasCached ? '(Cache)' : ''}`);
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

                        // Optimize Dry Run: Return immediately after first valid event
                        if (isDryRun) {
                            console.log(`PREVIEW_JSON:${JSON.stringify(events[0])}`);
                            await browser.close();
                            process.exit(0);
                        }

                        // BATCH_UPLOAD: If we have enough events, upload them now!
                        // This gives the user immediate feedback instead of waiting for 100+ events.
                        if (events.length >= 5) {
                            console.log(`🚀 Batch upload: ${events.length} events...`);
                            for (const ev of events) {
                                await axios.post(`${API_URL}/events`, ev);
                            }
                            totalEventsFound += events.length;
                            targetEventsFound += events.length;
                            await updateLog('RUNNING', `Found ${totalEventsFound} events so far at ${target.name}...`, totalEventsFound);
                            events.length = 0; // Clear array
                        }

                        // Dynamic Rate Limit
                        if (!wasCached) {
                            await new Promise(r => setTimeout(r, 1100)); // Respect Nominatim Policy
                        } else {
                            // Fast path!
                        }

                    } catch (err) {
                        console.warn("Skipping event:", err.message);
                    }
                }

                // Final Flush (Remaining events)
                if (events.length > 0) {
                    console.log(`✨ Parsed ${events.length} events. uploading...`);
                    for (const ev of events) {
                        await axios.post(`${API_URL}/events`, ev);
                    }
                    totalEventsFound += events.length;
                    targetEventsFound += events.length;
                    saveCache(); // Save intermittently
                    await updateLog('RUNNING', `Found ${events.length} events at ${target.name}`, totalEventsFound);

                } else {
                    console.log(`⚠️ No events found at ${target.name} using selector: ${selector}`);
                    await updateLog('RUNNING', `No events found at ${target.name} (Selector: ${selector})`, totalEventsFound);
                }

                // ALWAYS Report stats to server at end of target processing
                if (target.id && !isDryRun) {
                    try {
                        await axios.patch(`${API_URL}/targets/${target.id}`, {
                            lastEventsFound: targetEventsFound, // Use the specific target count
                            lastScrapedAt: new Date().toISOString()
                        });
                        console.log(`📝 Stats updated for ${target.name}: ${targetEventsFound} events.`);
                    } catch (e) {
                        console.warn("Could not update target stats:", e.message);
                    }
                }

            } catch (err) {
                console.error(`❌ Error scraping ${target.name}: ${err.message}`);
            } finally {
                await page.close();
            }
        }

        saveCache(); // Final Save


        // Log SUCCESS
        await updateLog('SUCCESS', 'Mission Complete', totalEventsFound);
        // Final update to set EndTime? The server updates existing rows, but explicitly sending endTime might be needed if server doesn't auto-set it on update.
        // Actually, let's send a specific payload for completion
        await axios.post(`${API_URL}/scout/log`, {
            id: RUN_ID,
            status: 'SUCCESS',
            eventsFound: totalEventsFound,
            logSummary: "All targets scanned.",
            endTime: new Date().toISOString()
        });

    } catch (err) {
        console.error(`❌ Fatal Error: ${err.message}`);
        // Log FAILURE
        await updateLog('FAILED', err.message);
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
    // let dateRaw = lines.length > 1 ? lines[lines.length - 2] : ""; // REMOVED


    // 3. Title is usually the FIRST line (after filtering noise)
    let title = lines[0];

    // Improved Date Extraction: Scan for month names
    const dateRegex = /(?:(\d{1,2})\s+)?(saus|vas|kov|bal|geg|bir|lie|rgp|rgs|spa|lap|gruo|sausio|vasario|kovo|balandžio|gegužės|birželio|liepos|rugpjūčio|rugsėjo|spalio|lapkričio|gruodžio)/i;
    let dateRaw = "";

    // Find line matching date regex
    for (const line of lines) {
        if (dateRegex.test(line)) {
            dateRaw = line;
            break;
        }
    }

    // Fallback: if no date found, try strict formats YYYY-MM-DD
    if (!dateRaw) {
        const isoDate = lines.find(l => /\d{4}-\d{2}-\d{2}/.test(l));
        if (isoDate) dateRaw = isoDate;
    }

    // If we still found nothing, revert to old heuristic (2nd to last) as last resort? 
    // Actually, safer to leave empty than guess wrong venue line.

    // Cleanup Title
    if (title && title.includes('|')) {
        // "Artist | Venue" -> sometimes title repeats venue
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

    // Attempt to refine venue if we found the date line
    // If dateRaw is found, venue is likely the line AFTER it, or the last line.
    if (dateRaw && lines.includes(dateRaw)) {
        const dateIdx = lines.indexOf(dateRaw);
        if (dateIdx < lines.length - 1) {
            venue = lines[dateIdx + 1];
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

    // Smart City Detection
    const LITHUANIAN_CITIES = [
        "Vilnius", "Kaunas", "Klaipėda", "Šiauliai", "Panevėžys",
        "Alytus", "Marijampolė", "Mažeikiai", "Jonava", "Utena",
        "Kėdainiai", "Telšiai", "Visaginas", "Tauragė", "Ukmergė",
        "Palanga", "Druskininkai", "Birštonas", "Trakai", "Neringa"
    ];

    let detectedCity = null;
    const fullText = text.toLowerCase();
    for (const city of LITHUANIAN_CITIES) {
        if (fullText.includes(city.toLowerCase())) {
            detectedCity = city;
            break;
        }
    }

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


// --- Cache Logic ---
const CACHE_FILE = path.join(__dirname, 'geocode_cache.json');
let geocodeCache = {};

function loadCache() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            geocodeCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
            console.log(`📦 Loaded ${Object.keys(geocodeCache).length} cached locations.`);
        }
    } catch (e) {
        console.warn("Could not load cache:", e.message);
    }
}

function saveCache() {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(geocodeCache, null, 2));
    } catch (e) {
        console.warn("Could not save cache:", e.message);
    }
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

    // CHECK CACHE
    if (geocodeCache[query]) {
        return geocodeCache[query];
    }

    try {
        // Rate limit happens outcome-side, but let's be safe
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'EventTrackerAntigravity/1.0 (contact@antigravity.dev)',
                'Referer': 'http://localhost'
            }
        });
        if (res.data && res.data.length > 0) {
            const result = { lat: res.data[0].lat, lon: res.data[0].lon }; // Store only what we need
            geocodeCache[query] = result;
            return result;
        }
    } catch (e) {
        // Ignore errors
        console.error("Geocode error:", e.message);
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


function extractTime(text) {
    const timeRegex = /([0-1]?[0-9]|2[0-3]):([0-5][0-9])/;
    const match = text.match(timeRegex);
    return match ? match[0] : null;
}

function parseLithuanianDate(dateStr, timeStr) {
    if (!dateStr) return new Date(); // Fallback

    const months = {
        'sausio': 0, 'vasario': 1, 'kovo': 2, 'balandžio': 3, 'gegužės': 4, 'birželio': 5,
        'liepos': 6, 'rugpjūčio': 7, 'rugsėjo': 8, 'spalio': 9, 'lapkričio': 10, 'gruodžio': 11,
        'saus': 0, 'vas': 1, 'kov': 2, 'bal': 3, 'geg': 4, 'bir': 5,
        'lie': 6, 'rgp': 7, 'rgs': 8, 'spa': 9, 'lap': 10, 'gruod': 11, 'gruo': 11
    };

    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth();
    let day = now.getDate();

    // Try to find month and day
    const lower = dateStr.toLowerCase();

    // Check for month name
    let foundMonth = false;
    for (const [mName, mIdx] of Object.entries(months)) {
        if (lower.includes(mName)) {
            month = mIdx;
            foundMonth = true;
            break;
        }
    }

    // Extract day (number)
    const dayMatch = lower.match(/(\d+)/);
    if (dayMatch) {
        day = parseInt(dayMatch[1], 10);
    }

    // Time parsing
    let hours = 19;
    let minutes = 0;
    if (timeStr) {
        const parts = timeStr.split(':');
        hours = parseInt(parts[0], 10);
        minutes = parseInt(parts[1], 10);
    }

    let d = new Date(year, month, day, hours, minutes);

    // Future date correction (e.g. scraping in Dec for Jan)
    // If the resulting date is in the past (by more than a day), assume it's next year
    // Exception: It might be today or yesterday
    if (d.getTime() < now.getTime() - 86400000 && foundMonth) {
        // If we found a month, and the date is in the past, likely next year
        // But trigger only if the month is "smaller" than current month?
        // e.g. We are in Dec (11), event is Jan (0). Date(2024, 0, 15) is in past.
        // We want 2025.
        if (month < now.getMonth()) {
            d.setFullYear(year + 1);
        }
    }

    return d;
}

runScout();

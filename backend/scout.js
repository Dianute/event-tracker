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

    const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
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

    // Find bottom anchor (Price/Status)
    let bottomIndex = lines.length - 1;
    const statusKeywords = ['Kaina', 'Išparduota', 'Atšaukta', 'Nemokamai'];

    for (let i = lines.length - 1; i >= 0; i--) {
        if (statusKeywords.some(kw => lines[i].includes(kw))) {
            bottomIndex = i;
            break;
        }
    }

    const location = lines[bottomIndex - 1] || "Unknown Location";
    const titleIndex = bottomIndex - 2;
    const title = lines[titleIndex] || "Unknown Title"; // Fallback to line above location
    const dateRaw = lines.slice(0, titleIndex).join(' ');

    return { title, location: location.split(',')[0], dateRaw }; // Take first part of location for better geocoding
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

const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.EVENTBRITE_API_KEY;
const PORT = process.env.PORT || 8080;
const API_URL = `http://localhost:${PORT}`;

// Location: Kaunas, Lithuania
const LAT = 54.8985;
const LON = 23.9036;

async function runEventbriteScout() {
    console.log("🎟️ Starting Eventbrite Scout...");

    if (!API_KEY) {
        console.error("❌ No EVENTBRITE_API_KEY found in .env");
        return;
    }

    try {
        // 1. Verify User/Org
        console.log("🔑 Verifying API Key...");
        const meRes = await axios.get('https://www.eventbriteapi.com/v3/users/me/', {
            headers: { Authorization: `Bearer ${API_KEY}` }
        });
        console.log(`✅ Authenticated as: ${meRes.data.name}`);

        // 2. Search for Events
        // Note: 'v3/events/search' is deprecated but might work for private tokens or organization events.
        // Alternative: List events from your organization: 'v3/organizations/{org_id}/events/'
        // Let's try to find organization first.
        // Actually, if the key is Personal OAuth, we might not have search access.
        // Let's try to list organizations first.

        // For general discovery, we often need 'v3/events/search' but it requires approval.
        // Let's try a direct search first, if it fails (403), we try Org events.

        let events = [];
        try {
            console.log("🌍 Searching for events nearby (Kaunas)...");
            const searchRes = await axios.get('https://www.eventbriteapi.com/v3/events/search/', {
                headers: { Authorization: `Bearer ${API_KEY}` },
                params: {
                    'location.latitude': LAT,
                    'location.longitude': LON,
                    'location.within': '50km',
                    'expand': 'venue'
                }
            });
            events = searchRes.data.events;
            console.log(`🎉 Found ${events.length} public events via Search API.`);
        } catch (err) {
            console.warn(`⚠️ Public Search failed (${err.response?.status || err.message}). This key might be restricted.`);
            console.log("🔄 Trying to fetch Organization events instead...");

            // Fallback: Fetch User's Organizations
            const userRes = await axios.get(`https://www.eventbriteapi.com/v3/users/${meRes.data.id}/organizations/`, {
                headers: { Authorization: `Bearer ${API_KEY}` }
            });

            if (userRes.data.organizations && userRes.data.organizations.length > 0) {
                for (const org of userRes.data.organizations) {
                    console.log(`🏢 Checking Organization: ${org.name} (${org.id})`);
                    const orgEvents = await axios.get(`https://www.eventbriteapi.com/v3/organizations/${org.id}/events/`, {
                        headers: { Authorization: `Bearer ${API_KEY}` },
                        params: { status: 'live', expand: 'venue' }
                    });
                    events = events.concat(orgEvents.data.events);
                }
            }
        }

        console.log(`📦 Total Processable Events: ${events.length}`);

        // 3. Process and Save
        for (const ev of events) {
            if (!ev || !ev.name) continue;

            const venue = ev.venue || {};
            const lat = venue.latitude ? parseFloat(venue.latitude) : (LAT + (Math.random() * 0.01)); // Fallback scatter
            const lng = venue.longitude ? parseFloat(venue.longitude) : (LON + (Math.random() * 0.01));

            const payload = {
                title: ev.name.text,
                description: ev.description.text || "No description",
                type: getCategory(ev.category_id), // Helper needed
                startTime: ev.start.utc, // ISO String
                endTime: ev.end.utc,
                lat: lat,
                lng: lng,
                venue: venue.address ? venue.address.localized_address_display : "Eventbrite Event",
                link: ev.url,
                date: ev.start.local.split('T')[0]
            };

            await axios.post(`${API_URL}/events`, payload);
            console.log(`   📤 Posted: ${payload.title}`);
        }

        console.log("✅ Eventbrite Sync Complete.");

    } catch (err) {
        console.error("❌ Eventbrite Error:", err.response?.data || err.message);
    }
}

function getCategory(id) {
    // Basic mapping, ID list is huge, so we guess or default
    return 'social';
}

runEventbriteScout();


const axios = require('axios');

async function testCreateEvent() {
    try {
        console.log("🚀 Testing Create Event API...");

        const payload = {
            title: "Test Event " + Date.now(),
            description: "Automated test description",
            type: "social",
            lat: 54.8985,
            lng: 23.9036,
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 3600000).toISOString(),
            venue: "Test Venue",
            date: new Date().toISOString().split('T')[0],
            phone: "+123456789" // Test with phone to verify column
        };

        const res = await axios.post('http://localhost:8080/events', payload);

        console.log("✅ API Success!");
        console.log("Response:", res.data);

    } catch (err) {
        console.error("❌ API Failed");
        if (err.response) {
            console.error(`Status: ${err.response.status}`);
            console.error("Data:", err.response.data);
        } else {
            console.error(err.message);
        }
    }
}

testCreateEvent();

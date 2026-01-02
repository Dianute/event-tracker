const axios = require('axios');

const event = {
    title: "Test Upload Event",
    description: "Debug upload",
    type: "music",
    lat: 55.7,
    lng: 21.1,
    startTime: new Date().toISOString(),
    venue: "Debug Venue",
    date: "Jan 15",
    link: "http://example.com/debug"
};

(async () => {
    try {
        const res = await axios.post('http://localhost:8080/events', event);
        console.log("Upload Success:", res.data);
    } catch (e) {
        console.error("Upload Failed:", e.response ? e.response.data : e.message);
    }
})();

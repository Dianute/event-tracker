const axios = require('axios');

async function verify() {
    const API = 'http://localhost:8080';
    try {
        console.log("1. Fetching initial targets...");
        const res1 = await axios.get(`${API}/targets`);
        console.log("Initial count:", res1.data.length);

        console.log("2. Adding test target...");
        const newTarget = {
            name: "Test Target",
            url: "https://example.com",
            selector: "body"
        };
        await axios.post(`${API}/targets`, newTarget);
        console.log("Added.");

        console.log("3. Fetching updated targets...");
        const res2 = await axios.get(`${API}/targets`);
        console.log("New count:", res2.data.length);
        const added = res2.data.find(t => t.name === "Test Target");

        if (added) {
            console.log("✅ API Saved Target Successfully:", added);

            console.log("4. Cleaning up...");
            await axios.delete(`${API}/targets/${added.id}`);
            console.log("Deleted.");
        } else {
            console.error("❌ Failed to save target!");
        }

    } catch (e) {
        console.error("❌ Verification Failed:", e.message);
        if (e.response) console.error("Response:", e.response.data);
    }
}

verify();

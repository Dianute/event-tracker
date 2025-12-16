const axios = require('axios');

async function checkTimes() {
    try {
        const res = await axios.get('http://localhost:8080/events');
        const events = res.data;
        console.log(`Found ${events.length} events.`);

        const times = {};
        events.forEach(e => {
            const t = e.startTime;
            times[t] = (times[t] || 0) + 1;
            console.log(`[${e.title.substring(0, 20)}...] Time: ${t} (Raw Date: ${e.date || 'N/A'})`);
        });

        console.log("\nDistribution:");
        console.table(times);
    } catch (e) {
        console.error("Error:", e.message);
    }
}

checkTimes();

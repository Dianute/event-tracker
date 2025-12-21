const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'events.db');
const db = new sqlite3.Database(dbPath);

console.log("🔍 Starting Deep Cleanup Inspection...");
console.log("----------------------------------------");
console.log(`System Time (JS Limit): ${new Date().toISOString()}`);
console.log(`System Time (Local): ${new Date().toLocaleString()}`);

db.serialize(() => {
    // 1. Check SQLite Internal Time
    db.get("SELECT datetime('now') as utc, datetime('now', 'localtime') as local", (err, row) => {
        if (err) console.error(err);
        console.log("SQLite NOW (UTC):", row.utc);
        console.log("SQLite NOW (Local):", row.local);
        console.log("----------------------------------------");

        // 2. List ALL Events and analyze simple JS comparison
        db.all("SELECT id, title, endTime FROM events", [], (err, rows) => {
            if (err) throw err;
            console.log(`Found ${rows.length} total events.`);

            rows.forEach(row => {
                const end = new Date(row.endTime);
                const now = new Date();
                const diffMinutes = (now - end) / 1000 / 60;

                let status = "✅ Active";
                if (diffMinutes > 15) status = "❌ SHOULD BE DELETED (>15m ago)";
                else if (diffMinutes > 0) status = "⏳ Ending Soon/Just Ended (<15m ago)";

                console.log(`[${row.id.substring(0, 4)}] '${row.title}'`);
                console.log(`   Ends:   ${row.endTime} (Parsed: ${end.toISOString()})`);
                console.log(`   Status: ${status} (Passed ${diffMinutes.toFixed(1)} mins ago)`);

                // Identify formatted string type
                if (row.endTime && row.endTime.endsWith('Z')) console.log("   Format: UTC ISO (Ends with Z)");
                else console.log("   Format: Local/Simple (No Z)");
                console.log("");
            });
        });

        // 3. Test the ACTUAL Delete queries
        console.log("--- TESTING SQL QUERY MATCHES ---");

        // UTC Match
        db.all("SELECT id, title FROM events WHERE endTime LIKE '%Z' AND endTime < datetime('now', '-15 minutes')", (err, rows) => {
            console.log(`SQL 'UTC' Cleanup would delete: ${rows.length} events`);
            rows.forEach(r => console.log(`   - DELETE ${r.title}`));
        });

        // Local Match
        db.all("SELECT id, title FROM events WHERE endTime NOT LIKE '%Z' AND endTime < datetime('now', 'localtime', '-15 minutes')", (err, rows) => {
            console.log(`SQL 'Local' Cleanup would delete: ${rows.length} events`);
            rows.forEach(r => console.log(`   - DELETE ${r.title}`));
        });
    });
});

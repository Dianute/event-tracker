const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'events.db'));

db.serialize(() => {
    console.log("--- DEBUGGER ---");

    // Check SQLite 'now' vs 'localtime'
    db.get("SELECT datetime('now') as utc, datetime('now', 'localtime') as local", (err, row) => {
        console.log("SQLite NOW (UTC):", row.utc);
        console.log("SQLite NOW (Local):", row.local);
        console.log("JS Date.now():", new Date().toISOString());
        console.log("----------------");

        // Check Events
        db.all("SELECT id, title, endTime FROM events", (err, rows) => {
            console.log(`Found ${rows.length} events.`);
            rows.forEach(r => {
                console.log(`[${r.id}] ${r.title}`);
                console.log(`   EndTime: ${r.endTime}`);
            });

            // Check Query Match (Current vs Proposed)
            console.log("----------------");
            db.all("SELECT id FROM events WHERE endTime < datetime('now', '-15 minutes')", (err, rows) => {
                console.log(`QUERY (UTC) would delete: ${rows.length} events`);
            });
            db.all("SELECT id FROM events WHERE endTime < datetime('now', 'localtime', '-15 minutes')", (err, rows) => {
                console.log(`QUERY (Local) would delete: ${rows.length} events`);
            });
        });
    });
});

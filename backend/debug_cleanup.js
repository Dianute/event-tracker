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

            // Check Query Match (Current Production Logic)
            console.log("----------------");

            // Query 1: UTC Candidates
            db.all("SELECT id, endTime FROM events WHERE endTime LIKE '%Z' AND endTime < datetime('now', '-15 minutes')", (err, rows) => {
                if (err) console.error(err);
                console.log(`QUERY 1 (UTC) matches: ${rows.length} events`);
                rows.forEach(r => console.log(`   [UTC Match] ${r.endTime}`));
            });

            // Query 2: Local Candidates
            db.all("SELECT id, endTime FROM events WHERE endTime NOT LIKE '%Z' AND endTime < datetime('now', 'localtime', '-15 minutes')", (err, rows) => {
                if (err) console.error(err);
                console.log(`QUERY 2 (Local) matches: ${rows.length} events`);
                rows.forEach(r => console.log(`   [Local Match] ${r.endTime}`));
            });

            // Debug: Show SQLite's idea of time
            db.get("SELECT datetime('now') as utc, datetime('now', 'localtime') as local, datetime('now', '-15 minutes') as utc_minus_15, datetime('now', 'localtime', '-15 minutes') as local_minus_15", (err, row) => {
                console.log("--- SQLite Time ---");
                console.log(row);
            });
        });
    });
});

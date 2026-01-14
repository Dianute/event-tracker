
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'events.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("📂 Inspecting SQLite DB:", dbPath);
    db.all("SELECT name, sql FROM sqlite_master WHERE type='table'", (err, tables) => {
        if (err) {
            console.error("❌ Error:", err.message);
            return;
        }
        tables.forEach(t => {
            console.log(`\n📋 Table: ${t.name}`);
            console.log(t.sql);
        });

        // Check row counts
        db.get("SELECT Count(*) as count FROM events", (err, row) => {
            if (row) console.log(`\n🔢 Events Count: ${row.count}`);
        });
    });
});

setTimeout(() => db.close(), 1000);

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'events.db');
const db = new sqlite3.Database(dbPath);

console.log(`Connecting to: ${dbPath}`);

db.all("SELECT id, title, LENGTH(title) as len FROM events WHERE title LIKE 'S%' OR title LIKE 'V%' OR LENGTH(title) < 10", [], (err, rows) => {
    if (err) {
        console.error("Error querying events:", err);
        return;
    }
    console.log(`Found ${rows.length} potentially short/suspicious titles:`);
    rows.forEach(r => {
        console.log(`[ID: ${r.id}] "${r.title}" (Len: ${r.title.length})`);
    });
});

db.close();

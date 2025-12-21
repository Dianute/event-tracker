const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'events.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log('--- TARGETS IN DATABASE ---');
    db.all("SELECT id, url, type, eventType FROM targets", (err, rows) => {
        if (err) {
            console.error(err);
            return;
        }
        if (rows.length === 0) {
            console.log("No targets found (Table is empty).");
        } else {
            rows.forEach(row => {
                console.log(`[${row.id}] Type: ${row.type}, Event: ${row.eventType}, URL: ${row.url}`);
            });
            console.log(`\nTotal: ${rows.length} targets found.`);
        }
        db.close();
    });
});

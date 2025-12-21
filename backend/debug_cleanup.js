const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'events.db'));

db.serialize(() => {
    db.get("SELECT datetime('now', '-1 hour') as cutoff", (err, row) => console.log("Cutoff:", row.cutoff));

    db.all("SELECT id, endTime FROM events WHERE endTime < datetime('now', '-1 hour')", (err, rows) => {
        if (err) console.error(err);
        else console.log(`FOUND ${rows.length} EXPIRED EVENTS.`);
    });
});

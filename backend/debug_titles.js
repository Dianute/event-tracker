const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('events.db');

db.all("SELECT title, date, venue FROM events ORDER BY id DESC LIMIT 50", [], (err, rows) => {
    if (err) {
        throw err;
    }
    console.log("--- Latest 50 Event Titles ---");
    rows.forEach((row) => {
        console.log(`[${row.date}] Title: "${row.title}" | Loc: ${row.location}`);
    });
    db.close();
});

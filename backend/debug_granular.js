const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'events.db'));

console.log("🔍 Granular Inspection: THE ROOP");
db.serialize(() => {
    // 1. Dump ALL rows for THE ROOP
    db.all("SELECT id, title, endTime FROM events WHERE title LIKE '%ROOP%'", [], (err, rows) => {
        console.log(`\n--- ALL Rows for 'THE ROOP' (${rows.length}) ---`);
        rows.forEach(r => {
            console.log(`ID: ${r.id} | End: '${r.endTime}' | EndsWithZ: ${r.endTime.endsWith('Z')}`);
        });
    });

    // 2. Test Dangerous Query specifically
    db.all("SELECT id, title, endTime FROM events WHERE title LIKE '%ROOP%' AND endTime LIKE '%Z' AND endTime < datetime('now', '-15 minutes')", [], (err, rows) => {
        console.log(`\n--- Matches UTC Delete Query (${rows.length}) ---`);
        rows.forEach(r => {
            console.log(`ID: ${r.id} | End: '${r.endTime}'`);
        });
    });
});

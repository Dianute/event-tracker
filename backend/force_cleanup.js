const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'events.db'));

console.log("🧹 FORCE CLEANUP STARTED");
db.serialize(() => {
    // 1. Delete UTC Expired
    db.run("DELETE FROM events WHERE endTime LIKE '%Z' AND endTime < datetime('now', '-15 minutes')", function (err) {
        if (err) console.error("UTC Delete Error:", err);
        else console.log(`✅ UTC Cleanup: Deleted ${this.changes} ended events.`);
    });

    // 2. Delete Local Expired (older text formats)
    db.run("DELETE FROM events WHERE endTime NOT LIKE '%Z' AND endTime < datetime('now', 'localtime', '-15 minutes')", function (err) {
        if (err) console.error("Local Delete Error:", err);
        else console.log(`✅ Local Cleanup: Deleted ${this.changes} ended events.`);
    });
});

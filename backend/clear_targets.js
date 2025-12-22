const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'events.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log('Opening database to clear targets...');

    db.run("DELETE FROM targets", function (err) {
        if (err) {
            console.error("Error clearing targets:", err);
        } else {
            // this.changes contains the number of rows modified
            console.log(`✅ Success! Removed ${this.changes} targets from the database.`);
        }
        db.close();
    });
});

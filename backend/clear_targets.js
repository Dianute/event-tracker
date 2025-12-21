const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'events.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log('Opening database...');

    // 1. Count targets before
    db.get("SELECT COUNT(*) as count FROM targets", (err, row) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log(`Current target count: ${row.count}`);

        // 2. Delete all targets
        db.run("DELETE FROM targets", (err) => {
            if (err) {
                console.error("Error clearing targets:", err);
            } else {
                console.log("✅ All targets have been removed from the database.");
            }

            // 3. Close
            db.close();
        });
    });
});

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('events.db');

db.run("DELETE FROM events WHERE title LIKE 'Sau'", function (err) {
    if (err) {
        return console.error(err.message);
    }
    console.log(`🧹 Cleaned up ${this.changes} bad 'Sau' events.`);
    db.close();
});

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'events.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database.');
});

const sql = `ALTER TABLE events ADD COLUMN imageUrl TEXT`;

db.run(sql, [], (err) => {
    if (err) {
        if (err.message.includes('duplicate column name')) {
            console.log("Column 'imageUrl' already exists. Skipping.");
        } else {
            console.error("Migration failed:", err.message);
        }
    } else {
        console.log("Migration successful: Added 'imageUrl' column.");
    }
    db.close();
});

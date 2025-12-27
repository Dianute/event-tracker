const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'events.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to database.');
});

db.serialize(() => {
    console.log("Adding imageUrl column...");
    db.run("ALTER TABLE events ADD COLUMN imageUrl TEXT;", (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log("Column 'imageUrl' already exists. Skipping.");
            } else {
                console.error("Error adding column:", err.message);
            }
        } else {
            console.log("✅ Column 'imageUrl' added successfully.");
        }
    });
});

db.close();

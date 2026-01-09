const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'events.db');
const SCHEMA_PATH = path.join(__dirname, 'auth_schema.sql');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err);
        process.exit(1);
    }
    console.log('Connected to database.');
});

const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');

db.serialize(() => {
    // Enable WAL mode for concurrency (Next.js + Express accessing same DB)
    db.run("PRAGMA journal_mode = WAL;", (err) => {
        if (err) console.error("Failed to enable WAL:", err);
        else console.log("WAL mode enabled.");
    });

    db.exec(schema, (err) => {
        if (err) {
            console.error('Error applying schema:', err);
        } else {
            console.log('Auth Schema applied successfully.');
        }
        db.close();
    });
});

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'events.db');
const db = new sqlite3.Database(dbPath);

const createTableSql = `
CREATE TABLE IF NOT EXISTS targets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    city TEXT,
    selector TEXT,
    lastEventsFound INTEGER DEFAULT 0,
    lastScrapedAt DATETIME
);
`;

db.serialize(() => {
    db.run(createTableSql, (err) => {
        if (err) {
            console.error("Error creating table:", err);
        } else {
            console.log("✅ 'targets' table created successfully.");
        }
        db.close();
    });
});

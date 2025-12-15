const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'events.db'));

const query = `
CREATE TABLE IF NOT EXISTS scout_logs (
    id TEXT PRIMARY KEY,
    startTime DATETIME DEFAULT CURRENT_TIMESTAMP,
    endTime DATETIME,
    status TEXT,
    eventsFound INTEGER DEFAULT 0,
    logSummary TEXT
);
`;

db.run(query, (err) => {
    if (err) {
        console.error("❌ Error running migration:", err.message);
    } else {
        console.log("✅ Successfully migrated: 'scout_logs' table created.");
    }
    db.close();
});

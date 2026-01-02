const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'events.db');
const db = new sqlite3.Database(dbPath);

const INVALID_TITLES = ['Sau', 'Vas', 'Kov', 'Bal', 'Geg', 'Bir', 'Lie', 'Rgp', 'Rgs', 'Spa', 'Lap', 'Gru'];

db.serialize(() => {
    // 1. Delete matching patterns (Aggressive)
    const patterns = INVALID_TITLES.map(t => `${t}%`);

    // We have to run multiple DELETEs or construct a big OR query
    // "DELETE FROM events WHERE title LIKE 'Sau%' OR title LIKE 'Vas%' ..."
    const clause = () => INVALID_TITLES.map(() => `title LIKE ?`).join(' OR ');

    const query = `DELETE FROM events WHERE ${clause()}`;

    db.run(query, patterns, function (err) {
        if (err) return console.error(err.message);
        console.log(`Deleted ${this.changes} events starting with Month abbreviations.`);
    });

    // 2. Delete events where Title looks like a date (e.g. "Sau 15" or "Jan 21")
    // SQLite doesn't have great regex, but we can do some basic GLOB or just fetch and filter.
    db.all("SELECT id, title FROM events", [], (err, rows) => {
        if (err) return console.error(err);

        const dateRegex = /^(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|saus|vas|kov|bal|geg|bir|lie|rgp|rgs|spa|lap|gru)[a-z]*\s*\d{1,2}$/i;

        const idsToDelete = rows.filter(r => dateRegex.test(r.title)).map(r => r.id);

        if (idsToDelete.length > 0) {
            const idPlaceholders = idsToDelete.map(() => '?').join(',');
            db.run(`DELETE FROM events WHERE id IN (${idPlaceholders})`, idsToDelete, function (err) {
                if (err) console.error(err);
                console.log(`Deleted ${this.changes} events with date-like titles.`);
            });
        } else {
            console.log("No date-like titles found.");
        }
    });
});

db.close();

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'events.db');
const db = new sqlite3.Database(DB_PATH);

console.log("🔧 Running database migration...");

db.serialize(() => {
    // Add new columns
    db.run(`ALTER TABLE events ADD COLUMN venue TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error("Error adding venue column:", err);
        } else {
            console.log("✅ Added 'venue' column");
        }
    });

    db.run(`ALTER TABLE events ADD COLUMN date TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error("Error adding date column:", err);
        } else {
            console.log("✅ Added 'date' column");
        }
    });

    db.run(`ALTER TABLE events ADD COLUMN link TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error("Error adding link column:", err);
        } else {
            console.log("✅ Added 'link' column");
        }
    });

    // Migrate existing data
    db.all("SELECT id, description FROM events WHERE venue IS NULL", [], (err, rows) => {
        if (err) {
            console.error("Error reading events:", err);
            return;
        }

        console.log(`\n📦 Migrating ${rows.length} events...`);

        rows.forEach(row => {
            const lines = (row.description || '').split('\n').map(l => l.trim()).filter(l => l);
            const venue = lines[0] || '';
            const date = lines[1] || '';
            const link = lines[2] && lines[2].startsWith('http') ? lines[2] : '';

            db.run(
                `UPDATE events SET venue = ?, date = ?, link = ? WHERE id = ?`,
                [venue, date, link, row.id],
                (err) => {
                    if (err) console.error(`Error updating event ${row.id}:`, err);
                }
            );
        });

        console.log("✅ Migration complete!");
        db.close();
    });
});

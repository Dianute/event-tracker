const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('events.db');

db.all("SELECT id, title FROM events", [], (err, rows) => {
    if (err) return console.error(err);

    // Regex for "Date-like" titles (e.g. "Jan 21", "Sau 15")
    const dateTitleRegex = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Saus|Vas|Kov|Bal|Geg|Bir|Lie|Rgp|Rgs|Spa|Lap|Gruo).*\d+/i;

    let deleted = 0;
    const stmt = db.prepare("DELETE FROM events WHERE id = ?");

    rows.forEach(row => {
        if (dateTitleRegex.test(row.title) || row.title === 'Sau') {
            stmt.run(row.id);
            deleted++;
            console.log(`Deleting bad title: "${row.title}"`);
        }
    });
    console.log(`🧹 Cleaned up ${deleted} bad events.`);
    stmt.finalize();
    db.close();
});

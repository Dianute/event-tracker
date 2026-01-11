require('dotenv').config();
const db = require('./db');

async function update() {
    try {
        console.log("Creating saved_locations table...");
        await db.query(`
            CREATE TABLE IF NOT EXISTS saved_locations (
                id SERIAL PRIMARY KEY,
                userEmail TEXT NOT NULL,
                venue TEXT NOT NULL,
                lat DOUBLE PRECISION NOT NULL,
                lng DOUBLE PRECISION NOT NULL,
                nickname TEXT, 
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_saved_locations_email ON saved_locations(userEmail);`);
        console.log("Success!");
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

update();

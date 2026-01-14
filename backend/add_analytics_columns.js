const db = require('./db');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function migrate() {
    try {
        console.log("Adding analytics columns using shared DB connection...");

        await db.query(`
            ALTER TABLE events 
            ADD COLUMN IF NOT EXISTS clicks_location INT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS clicks_phone INT DEFAULT 0;
        `);

        console.log("Columns added successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();

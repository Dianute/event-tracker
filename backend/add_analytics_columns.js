const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function migrate() {
    try {
        console.log("Adding analytics columns...");

        await pool.query(`
            ALTER TABLE events 
            ADD COLUMN IF NOT EXISTS clicks_location INT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS clicks_phone INT DEFAULT 0;
        `);

        console.log("Columns added successfully.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await pool.end();
    }
}

migrate();

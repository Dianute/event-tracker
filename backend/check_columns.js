const db = require('./db');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function checkColumns() {
    try {
        console.log("Checking events table columns...");

        // This query checks the actual columns in the database for the 'events' table
        const result = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'events';
        `);

        // Format and print the list of columns
        const columns = result.rows.map(row => row.column_name);
        console.log("Existing columns:", columns.sort());

        const hasLocation = columns.includes('clicks_location');
        const hasPhone = columns.includes('clicks_phone');

        console.log("Has clicks_location:", hasLocation);
        console.log("Has clicks_phone:", hasPhone);

        if (!hasLocation || !hasPhone) {
            console.error("❌ MISSING COLUMNS!");
        } else {
            console.log("✅ Columns present.");
        }

        process.exit(0);
    } catch (err) {
        console.error("Check failed:", err);
        process.exit(1);
    }
}

checkColumns();

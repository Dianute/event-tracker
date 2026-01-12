require('dotenv').config();
const db = require('./db');

async function checkSchema() {
    try {
        const { rows } = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'events';
        `);
        console.log('Events Table Columns:', rows.map(r => r.column_name));

        const phoneCol = rows.find(r => r.column_name === 'phone');
        if (phoneCol) {
            console.log('✅ Phone column exists!');
        } else {
            console.error('❌ Phone column MISSING!');
        }
    } catch (err) {
        console.error('Check failed:', err);
    } finally {
        // Just keeping process alive for a sec to ensure logs flush if needed
        setTimeout(() => process.exit(0), 1000);
    }
}

checkSchema();

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function addPhoneColumn() {
    try {
        console.log('🔧 Adding phone column to user_locations...');
        await pool.query('ALTER TABLE user_locations ADD COLUMN IF NOT EXISTS phone TEXT');
        console.log('✅ Phone column added to user_locations!');

        console.log('🔧 Adding phone column to events...');
        await pool.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS phone TEXT');
        console.log('✅ Phone column added to events!');

        console.log('\n🎉 Migration complete! Phone columns are ready.');
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await pool.end();
    }
}

addPhoneColumn();

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function checkLocations() {
    try {
        // Get total count
        const { rows: total } = await pool.query('SELECT COUNT(*) FROM user_locations');
        console.log(`\n📍 Total saved locations: ${total[0].count}`);

        // Get count by user
        const { rows: byUser } = await pool.query(
            'SELECT userEmail, COUNT(*) as count FROM user_locations GROUP BY userEmail ORDER BY count DESC'
        );

        console.log('\n👥 Locations by user:');
        byUser.forEach(row => {
            console.log(`   ${row.useremail}: ${row.count} locations`);
        });

        // Show all locations
        const { rows: locations } = await pool.query(
            'SELECT userEmail, name, venue FROM user_locations ORDER BY userEmail, name'
        );

        console.log('\n📋 All saved locations:');
        locations.forEach(loc => {
            console.log(`   ${loc.useremail}: "${loc.name}" at ${loc.venue}`);
        });

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkLocations();

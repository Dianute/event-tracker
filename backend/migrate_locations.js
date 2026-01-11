require('dotenv').config();
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function migrateLocations() {
    console.log('🚀 Starting location migration...\n');

    try {
        // 1. Fetch all events with locations
        console.log('📥 Fetching events from database...');
        const { rows: events } = await pool.query(
            'SELECT DISTINCT ON (userEmail, venue) id, userEmail, title, venue, lat, lng, createdAt FROM events WHERE venue IS NOT NULL AND lat IS NOT NULL AND lng IS NOT NULL ORDER BY userEmail, venue, createdAt DESC'
        );

        console.log(`✅ Found ${events.length} unique locations from events\n`);

        if (events.length === 0) {
            console.log('ℹ️  No locations to migrate. Exiting.');
            process.exit(0);
        }

        // 2. Group by user and deduplicate by venue
        const locationsByUser = {};
        events.forEach(event => {
            if (!event.useremail) return; // Skip events without user

            if (!locationsByUser[event.useremail]) {
                locationsByUser[event.useremail] = [];
            }

            // Check if this venue already exists for this user
            const exists = locationsByUser[event.useremail].some(loc => loc.venue === event.venue);
            if (!exists) {
                locationsByUser[event.useremail].push({
                    userEmail: event.useremail,
                    name: event.title,
                    venue: event.venue,
                    lat: event.lat,
                    lng: event.lng
                });
            }
        });

        // 3. Insert into user_locations table
        let inserted = 0;
        let skipped = 0;

        for (const userEmail in locationsByUser) {
            const locations = locationsByUser[userEmail];
            console.log(`👤 Processing ${locations.length} locations for ${userEmail}...`);

            for (const loc of locations) {
                // Check if location already exists
                const { rows: existing } = await pool.query(
                    'SELECT id FROM user_locations WHERE userEmail = $1 AND venue = $2',
                    [loc.userEmail, loc.venue]
                );

                if (existing.length > 0) {
                    skipped++;
                    continue;
                }

                // Insert new location
                const id = uuidv4();
                await pool.query(
                    'INSERT INTO user_locations (id, userEmail, name, venue, lat, lng) VALUES ($1, $2, $3, $4, $5, $6)',
                    [id, loc.userEmail, loc.name, loc.venue, loc.lat, loc.lng]
                );
                inserted++;
            }
        }

        console.log('\n✅ Migration complete!');
        console.log(`   📍 Inserted: ${inserted} locations`);
        console.log(`   ⏭️  Skipped: ${skipped} duplicates`);
        console.log('\n🎉 Your saved spots are now ready to use!');

    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrateLocations();

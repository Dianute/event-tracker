const db = require('./db');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function migrate() {
    try {
        console.log("Running Moderation & User Migration...");

        // 1. Create Users Table
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                email TEXT PRIMARY KEY,
                is_blocked BOOLEAN DEFAULT FALSE,
                role TEXT DEFAULT 'user',
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log("✅ Users table created.");

        // 2. Add Status to Events
        await db.query(`
            ALTER TABLE events 
            ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
        `);
        console.log("✅ added status column.");

        // 3. Mark existing events as 'approved' (so current site doesn't break)
        await db.query(`
            UPDATE events SET status = 'approved' WHERE status IS NULL OR status = 'pending';
        `);
        console.log("✅ Existing events approved.");

        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();

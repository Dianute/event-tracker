const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        console.log("🩹 Patching 'menus' table schema...");

        // 1. Force 'content' column to be TEXT (Fixes JSONB mismatch error)
        try {
            await pool.query("ALTER TABLE menus ALTER COLUMN content TYPE TEXT USING content::text;");
            console.log("✅ Successfully converted 'content' column to TEXT.");
        } catch (alterErr) {
            console.warn("⚠️ Alter column skipped/failed (Table might not exist yet):", alterErr.message);
        }

        // 2. Ensure table exists (Safety check)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS menus (
                id TEXT PRIMARY KEY,
                user_email TEXT NOT NULL,
                title TEXT,
                content TEXT,
                theme_config JSONB,
                image_url TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log("✅ Verified 'menus' table exists.");

    } catch (err) {
        console.error("❌ Patch failed:", err);
    } finally {
        await pool.end();
    }
})();

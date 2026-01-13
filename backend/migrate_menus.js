const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        console.log("Starting Menus Table Migration...");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS menus (
                id TEXT PRIMARY KEY,
                user_email TEXT NOT NULL,
                title TEXT,
                content JSONB,
                theme_config JSONB,
                image_url TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_menus_user_email ON menus (user_email);
        `);

        console.log("✅ Menus table created successfully.");
    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        await pool.end();
    }
}

migrate();

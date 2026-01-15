const { Pool } = require('pg');

// Railway / Cloud Postgres often requires SSL with 'rejectUnauthorized: false'
// especially for internal/private connections that use self-signed certs.
let pool;
try {
    if (!process.env.DATABASE_URL) {
        console.warn('⚠️ DATABASE_URL is missing. Database features will fail.');
    }
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
} catch (e) {
    console.error('❌ Failed to initialize DB Pool:', e.message);
    // Create a dummy pool that always errors on query
    pool = {
        query: async () => { throw new Error('DB Init Failed'); },
        connect: (cb) => cb(new Error('DB Init Failed'))
    };
}

// Test connection
try {
    pool.connect((err, client, release) => {
        if (err) {
            console.error('❌ FATAL: Database Connection Failed:', err.message);
            if (err.errors) console.error('🔍 Aggregate Errors:', err.errors); // Log inner errors
            console.error('Context: Ensure DATABASE_URL is set correctly.');
        } else {
            client.query('SELECT NOW()', (err, result) => {
                release();
                if (err) {
                    console.error('❌ Connection successful but query failed:', err.message);
                } else {
                    console.log('✅ Connected to PostgreSQL:', result.rows[0].now);
                }
            });
        }
    });
} catch (e) {
    console.error('❌ DB Connect threw sync error:', e.message);
}

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};

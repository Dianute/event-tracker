const { Pool } = require('pg');

// Railway / Cloud Postgres often requires SSL with 'rejectUnauthorized: false'
// especially for internal/private connections that use self-signed certs.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Test connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ FATAL: Database Connection Failed:', err.message);
        console.error('Context: Ensure DATABASE_URL is set in Railway Variables.');
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

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};

const { Pool } = require('pg');

// Create a new pool using the connection string from env
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test connection
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error acquiring client', err.stack);
    }
    client.query('SELECT NOW()', (err, result) => {
        release();
        if (err) {
            return console.error('Error executing query', err.stack);
        }
        console.log('✅ Connected to PostgreSQL:', result.rows[0].now);
    });
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};

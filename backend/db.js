const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

// Validate DATABASE_URL in production
if (isProduction && !process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is required in production');
    process.exit(1);
}

// Use Render's DATABASE_URL if available, otherwise fallback to local DB variables
const connectionString = process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`;

const pool = new Pool({
    connectionString: connectionString,
    // Enable SSL specifically for production (Render)
    ssl: isProduction ? { rejectUnauthorized: false } : false,
    // Connection pool settings for better stability
    max: 20, // Maximum pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Handle connection errors
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

pool.on('connect', () => {
    console.log('Database connected successfully');
});

module.exports = {
    query: (text, params) => {
        return pool.query(text, params).catch(err => {
            console.error('Database query error:', err.message);
            throw err;
        });
    },
    // Graceful shutdown helper
    close: () => pool.end(),
};

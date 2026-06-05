import { Pool } from 'pg';

const pool = new Pool({
  user: 'admin',
  password: 'local_dev_password_123',
  host: 'localhost',
  port: 5433,
  database: 'declared_system'
});

async function initDb() {
  try {
    console.log('Connecting to database...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id SERIAL PRIMARY KEY,
        raw_text TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database initialized successfully. Table journal_entries is ready.');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    await pool.end();
  }
}

initDb();

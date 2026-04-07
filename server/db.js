import pg from 'pg';

const { Pool } = pg;

const isLocalhost = (process.env.DATABASE_URL || '').includes('localhost') ||
                    (process.env.DATABASE_URL || '').includes('127.0.0.1');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocalhost ? false : { rejectUnauthorized: false },
});

export async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS diagrams (
      question_id TEXT PRIMARY KEY,
      image_data TEXT NOT NULL,
      caption TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('Database schema initialized');
}

export default pool;

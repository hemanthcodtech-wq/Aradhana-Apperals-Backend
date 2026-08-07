require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    await pool.query(`
      ALTER TABLE support_agents 
      ADD COLUMN IF NOT EXISTS access_pages JSONB DEFAULT '[]'::jsonb;
    `);
    console.log("Migration successful: added access_pages to support_agents");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    pool.end();
  }
}

runMigration();

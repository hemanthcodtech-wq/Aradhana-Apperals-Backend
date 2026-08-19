require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Q4qC3fOixkPv@ep-young-water-a17p2nd2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' });

async function migrate() {
  try {
    await pool.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS product_code VARCHAR(100),
      ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS reviews JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS allow_reviews BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS is_festive BOOLEAN DEFAULT FALSE;
    `);
    console.log("Migration successful");
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
migrate();

require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    console.log("Adding columns...");
    await pool.query(`ALTER TABLE offers ADD COLUMN IF NOT EXISTS name VARCHAR(255)`);
    await pool.query(`ALTER TABLE offers ADD COLUMN IF NOT EXISTS offer_type VARCHAR(20) DEFAULT 'coupon'`);
    await pool.query(`ALTER TABLE offers ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT 'percent'`);
    await pool.query(`ALTER TABLE offers ALTER COLUMN code DROP NOT NULL`);
    console.log("Migration successful");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit();
  }
}

migrate();

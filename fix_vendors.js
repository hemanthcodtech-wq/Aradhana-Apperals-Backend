const pool = require('./db');
async function fix() {
  try {
    await pool.query('ALTER TABLE vendors ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP;');
    console.log('Fixed vendors table.');
  } catch(e) {
    console.error('Error:', e);
  }
  process.exit();
}
fix();

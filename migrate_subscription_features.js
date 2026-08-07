const pool = require('./db');

async function migrate() {
  try {
    await pool.query('ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS features JSONB DEFAULT \'{}\';');
    await pool.query('ALTER TABLE vendor_subscriptions ADD COLUMN IF NOT EXISTS features JSONB DEFAULT \'{}\';');
    console.log("✅ Subscription features migration successful");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
  } finally {
    process.exit();
  }
}

migrate();

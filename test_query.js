const pool = require('./db');
async function test() {
  try {
    const res = await pool.query(`
      SELECT p.* FROM products p
      WHERE p.is_active = true
      AND (
        p.vendor_id IS NULL
        OR EXISTS (
          SELECT 1 FROM vendors v
          WHERE v.id = p.vendor_id
          AND v.subscription_expires_at IS NOT NULL
          AND v.subscription_expires_at > NOW()
        )
      )
      ORDER BY p.id DESC
    `);
    console.log('Success:', res.rowCount);
  } catch(e) {
    console.error('Error:', e);
  }
  process.exit();
}
test();

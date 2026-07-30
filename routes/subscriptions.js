const router = require('express').Router();
const pool = require('../db');
const { authMiddleware } = require('./auth');
const { vendorAuthMiddleware } = require('./vendorAuth');
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access only' });
  next();
}

// PUBLIC — POST /api/subscriptions/create-order  (create Razorpay order)
router.post('/create-order', async (req, res) => {
  const { plan_id } = req.body;
  if (!plan_id) return res.status(400).json({ error: 'plan_id required' });
  try {
    const planRes = await pool.query('SELECT * FROM subscription_plans WHERE id=$1 AND is_active=TRUE', [plan_id]);
    if (!planRes.rows.length) return res.status(404).json({ error: 'Plan not found' });
    const plan = planRes.rows[0];
    const order = await razorpay.orders.create({
      amount: Math.round(plan.price * 100),
      currency: 'INR',
      receipt: `sub_${plan_id}_${Date.now()}`,
    });
    res.json({ order, key: process.env.RAZORPAY_KEY_ID, plan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUBLIC — GET /api/subscriptions/plans
router.get('/plans', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM subscription_plans WHERE is_active=TRUE ORDER BY months ASC');
    res.json({ plans: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// VENDOR — POST /api/subscriptions/subscribe
// Called after successful Razorpay payment with payment_id + plan_id
router.post('/subscribe', vendorAuthMiddleware, async (req, res) => {
  const { plan_id, payment_id } = req.body;
  if (!plan_id || !payment_id) return res.status(400).json({ error: 'plan_id and payment_id required' });
  try {
    const planRes = await pool.query('SELECT * FROM subscription_plans WHERE id=$1 AND is_active=TRUE', [plan_id]);
    if (!planRes.rows.length) return res.status(404).json({ error: 'Plan not found' });
    const plan = planRes.rows[0];

    // Calculate expiry — extend from current expiry if still active
    const vendorRes = await pool.query('SELECT subscription_expires_at FROM vendors WHERE id=$1', [req.vendorId]);
    const currentExpiry = vendorRes.rows[0]?.subscription_expires_at;
    const base = currentExpiry && new Date(currentExpiry) > new Date() ? new Date(currentExpiry) : new Date();
    const expiresAt = new Date(base);
    expiresAt.setMonth(expiresAt.getMonth() + plan.months);

    await pool.query(
      `INSERT INTO vendor_subscriptions (vendor_id, plan_id, plan_name, months, amount, payment_id, starts_at, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7)`,
      [req.vendorId, plan.id, plan.name, plan.months, plan.price, payment_id, expiresAt]
    );
    await pool.query('UPDATE vendors SET subscription_expires_at=$1 WHERE id=$2', [expiresAt, req.vendorId]);

    res.json({ message: 'Subscription activated', expires_at: expiresAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// VENDOR — POST /api/subscriptions/subscribe-signup
// Called during signup (before vendor record exists) — stores payment against email
router.post('/subscribe-signup', async (req, res) => {
  const { email, plan_id, payment_id } = req.body;
  if (!email || !plan_id || !payment_id) return res.status(400).json({ error: 'email, plan_id and payment_id required' });
  try {
    const planRes = await pool.query('SELECT * FROM subscription_plans WHERE id=$1 AND is_active=TRUE', [plan_id]);
    if (!planRes.rows.length) return res.status(404).json({ error: 'Plan not found' });
    res.json({ ok: true, plan: planRes.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// VENDOR — GET /api/subscriptions/my
router.get('/my', vendorAuthMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM vendor_subscriptions WHERE vendor_id=$1 ORDER BY created_at DESC',
      [req.vendorId]
    );
    res.json({ subscriptions: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN — GET /api/subscriptions/admin/plans
router.get('/admin/plans', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM subscription_plans ORDER BY months ASC');
    res.json({ plans: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN — PUT /api/subscriptions/admin/plans/:id
router.put('/admin/plans/:id', authMiddleware, adminOnly, async (req, res) => {
  const { price, is_active } = req.body;
  try {
    const result = await pool.query(
      'UPDATE subscription_plans SET price=$1, is_active=$2 WHERE id=$3 RETURNING *',
      [price, is_active, req.params.id]
    );
    res.json({ plan: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN — GET /api/subscriptions/admin/vendors
router.get('/admin/vendors', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT v.id, v.name, v.store_name, v.email, v.subscription_expires_at,
             vs.plan_name, vs.amount, vs.payment_id, vs.created_at as subscribed_at
      FROM vendors v
      LEFT JOIN vendor_subscriptions vs ON vs.id = (
        SELECT id FROM vendor_subscriptions WHERE vendor_id=v.id ORDER BY created_at DESC LIMIT 1
      )
      WHERE v.status='approved'
      ORDER BY v.created_at DESC
    `);
    res.json({ vendors: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

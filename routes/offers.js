const router = require('express').Router();
const pool = require('../db');
const { authMiddleware } = require('./auth');
const { vendorAuthMiddleware } = require('./vendorAuth');

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access only' });
  next();
}

// ── ADMIN ──────────────────────────────────────────────

// GET /api/offers/admin?type=offer|coupon
router.get('/admin', authMiddleware, adminOnly, async (req, res) => {
  const { type } = req.query;
  try {
    const result = await pool.query(
      `SELECT * FROM offers WHERE created_by='admin' ${type ? "AND offer_type=$1" : ""} ORDER BY created_at DESC`,
      type ? [type] : []
    );
    res.json({ offers: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/offers/admin
router.post('/admin', authMiddleware, adminOnly, async (req, res) => {
  const { name, code, offer_type, discount_type, discount_percent, scope, category_ids, product_ids, min_type, min_value, usage_type, expires_at } = req.body;
  if (!discount_percent) return res.status(400).json({ error: 'discount_percent required' });
  if (offer_type === 'coupon' && !code) return res.status(400).json({ error: 'code required for coupon' });
  if (offer_type === 'offer' && !name) return res.status(400).json({ error: 'name required for offer' });
  try {
    const result = await pool.query(
      `INSERT INTO offers (name, code, offer_type, discount_type, discount_percent, scope, category_ids, product_ids, min_type, min_value, usage_type, expires_at, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'admin') RETURNING *`,
      [name || null, code ? code.toUpperCase() : null, offer_type || 'coupon',
       discount_type || 'percent', discount_percent, scope || 'all',
       JSON.stringify(category_ids || []), JSON.stringify(product_ids || []),
       min_type || 'amount', min_value || 0, usage_type || 'multiple',
       expires_at || null]
    );
    res.json({ offer: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/offers/admin/:id
router.put('/admin/:id', authMiddleware, adminOnly, async (req, res) => {
  const { name, code, offer_type, discount_type, discount_percent, scope, category_ids, product_ids, min_type, min_value, usage_type, expires_at, is_active } = req.body;
  try {
    const result = await pool.query(
      `UPDATE offers SET name=$1, code=$2, offer_type=$3, discount_type=$4, discount_percent=$5, scope=$6,
       category_ids=$7, product_ids=$8, min_type=$9, min_value=$10, usage_type=$11,
       expires_at=$12, is_active=$13
       WHERE id=$14 AND created_by='admin' RETURNING *`,
      [name || null, code ? code.toUpperCase() : null, offer_type || 'coupon',
       discount_type || 'percent', discount_percent, scope,
       JSON.stringify(category_ids || []), JSON.stringify(product_ids || []),
       min_type, min_value, usage_type, expires_at || null, is_active ?? true,
       req.params.id]
    );
    res.json({ offer: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/offers/admin/:id
router.delete('/admin/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await pool.query("DELETE FROM offers WHERE id=$1 AND created_by='admin'", [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── VENDOR ─────────────────────────────────────────────

// GET /api/offers/vendor?type=offer|coupon
router.get('/vendor', vendorAuthMiddleware, async (req, res) => {
  const { type } = req.query;
  try {
    const result = await pool.query(
      `SELECT * FROM offers WHERE created_by='vendor' AND vendor_id=$1 ${type ? "AND offer_type=$2" : ""} ORDER BY created_at DESC`,
      type ? [req.vendorId, type] : [req.vendorId]
    );
    res.json({ offers: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/offers/vendor
router.post('/vendor', vendorAuthMiddleware, async (req, res) => {
  const { name, code, offer_type, discount_type, discount_percent, scope, category_ids, product_ids, min_type, min_value, usage_type, expires_at } = req.body;
  if (!discount_percent) return res.status(400).json({ error: 'discount_percent required' });
  if (offer_type === 'coupon' && !code) return res.status(400).json({ error: 'code required for coupon' });
  if (offer_type === 'offer' && !name) return res.status(400).json({ error: 'name required for offer' });
  try {
    const result = await pool.query(
      `INSERT INTO offers (name, code, offer_type, discount_type, discount_percent, scope, category_ids, product_ids, min_type, min_value, usage_type, expires_at, created_by, vendor_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'vendor',$13) RETURNING *`,
      [name || null, code ? code.toUpperCase() : null, offer_type || 'coupon',
       discount_type || 'percent', discount_percent, scope || 'all',
       JSON.stringify(category_ids || []), JSON.stringify(product_ids || []),
       min_type || 'amount', min_value || 0, usage_type || 'multiple',
       expires_at || null, req.vendorId]
    );
    res.json({ offer: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/offers/vendor/:id
router.put('/vendor/:id', vendorAuthMiddleware, async (req, res) => {
  const { name, code, offer_type, discount_type, discount_percent, scope, category_ids, product_ids, min_type, min_value, usage_type, expires_at, is_active } = req.body;
  try {
    const result = await pool.query(
      `UPDATE offers SET name=$1, code=$2, offer_type=$3, discount_type=$4, discount_percent=$5, scope=$6,
       category_ids=$7, product_ids=$8, min_type=$9, min_value=$10, usage_type=$11,
       expires_at=$12, is_active=$13
       WHERE id=$14 AND created_by='vendor' AND vendor_id=$15 RETURNING *`,
      [name || null, code ? code.toUpperCase() : null, offer_type || 'coupon',
       discount_type || 'percent', discount_percent, scope,
       JSON.stringify(category_ids || []), JSON.stringify(product_ids || []),
       min_type, min_value, usage_type, expires_at || null, is_active ?? true,
       req.params.id, req.vendorId]
    );
    res.json({ offer: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/offers/vendor/:id
router.delete('/vendor/:id', vendorAuthMiddleware, async (req, res) => {
  try {
    await pool.query("DELETE FROM offers WHERE id=$1 AND created_by='vendor' AND vendor_id=$2", [req.params.id, req.vendorId]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/offers/active — public, returns all active offers & coupons
router.get('/active', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM offers WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW()) ORDER BY created_at DESC`
    );
    // Also include admin coupons
    const coupons = await pool.query(
      `SELECT *, 'coupon' as offer_type FROM coupons WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW()) ORDER BY created_at DESC`
    );
    res.json({ offers: [...result.rows, ...coupons.rows] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

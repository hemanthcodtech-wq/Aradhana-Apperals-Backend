const router = require('express').Router();
const pool = require('../db');
const { authMiddleware } = require('./auth');

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access only' });
  next();
}

// GET /api/admin/stats
router.get('/stats', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [users, orders, revenue] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users WHERE role=$1', ['user']),
      pool.query('SELECT COUNT(*) FROM orders'),
      pool.query("SELECT COALESCE(SUM(total),0) as total FROM orders WHERE status != 'cancelled'"),
    ]);
    res.json({
      totalUsers: parseInt(users.rows[0].count),
      totalOrders: parseInt(orders.rows[0].count),
      totalRevenue: parseFloat(revenue.rows[0].total),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users
router.get('/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, phone, role, is_verified, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ users: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id=$1 AND role != $2', [req.params.id, 'admin']);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/orders
router.get('/orders', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, u.name as user_name, u.email as user_email
       FROM orders o LEFT JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC`
    );
    res.json({ orders: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/orders/:id/status
router.put('/orders/:id/status', authMiddleware, adminOnly, async (req, res) => {
  const { status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE orders SET status=$1 WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );
    res.json({ order: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const shiprocket = require('../utils/shiprocket');

// POST /api/admin/orders/:id/ship
router.post('/orders/:id/ship', authMiddleware, adminOnly, async (req, res) => {
  try {
    const orderRes = await pool.query('SELECT * FROM orders WHERE id=$1', [req.params.id]);
    const order = orderRes.rows[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });

    let items = [];
    try { items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []); } catch(e) {}
    
    let address = {};
    try { address = typeof order.address === 'string' ? JSON.parse(order.address) : (order.address || {}); } catch(e) {}

    const orderItems = items.map(item => ({
      name: item.product?.name || 'Product',
      sku: item.variant?.size || 'Default',
      units: item.qty || 1,
      selling_price: item.variant?.price || item.product?.price || 0,
    }));

    const shiprocketPayload = {
      order_id: order.order_number || order.id.toString(),
      order_date: new Date(order.created_at).toISOString().split('T')[0],
      billing_customer_name: address.name || 'Customer',
      billing_last_name: '',
      billing_address: address.line1 || 'No Address',
      billing_city: address.city || 'City',
      billing_pincode: address.pincode || '110001',
      billing_state: address.state || 'State',
      billing_country: 'India',
      billing_email: order.user_email || 'test@test.com',
      billing_phone: order.user_phone || address.mobile || '9999999999',
      shipping_is_billing: true,
      order_items: orderItems,
      payment_method: order.payment_method === 'cod' ? 'COD' : 'Prepaid',
      sub_total: order.payment_method === 'cod' ? (order.total - (order.advance_paid || 0)) : order.total,
      length: 10,
      breadth: 10,
      height: 10,
      weight: 0.5
    };

    // 1. Create Custom Order in Shiprocket
    const srOrder = await shiprocket.createCustomOrder(shiprocketPayload);
    const shipmentId = srOrder.shipment_id || srOrder.payload?.shipment_id;
    if (!shipmentId) throw new Error('Shiprocket did not return a shipment_id');

    // 2. Generate AWB
    const awbRes = await shiprocket.assignAWB(shipmentId);
    const awbCode = awbRes.response?.data?.awb_code || awbRes.awb_code;

    // 3. Save to database
    await pool.query(
      'UPDATE orders SET tracking_id=$1, tracking_link=$2, status=$3 WHERE id=$4',
      [awbCode, `https://shiprocket.co/tracking/${awbCode}`, 'shipped', req.params.id]
    );

    res.json({ awb: awbCode, tracking_link: `https://shiprocket.co/tracking/${awbCode}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// --- Products ---
router.get('/products', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
    res.json({ products: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/products', authMiddleware, adminOnly, async (req, res) => {
  const { 
    name, description, product_code, category, model, is_active, 
    is_bestseller, is_trending, is_offer, is_festive, allow_reviews, 
    variants, details, reviews, image_url, images, slug, short_description, vendor_id 
  } = req.body;
  
  try {
    let price = 0;
    let stock = 0;
    if (variants && variants.length > 0) {
      if (variants[0].sizes && variants[0].sizes.length > 0) {
        price = variants[0].sizes[0].our_price || variants[0].sizes[0].mrp || 0;
        stock = variants.reduce((acc, v) => acc + (v.sizes || []).reduce((sAcc, s) => sAcc + (Number(s.stock) || 0), 0), 0);
      }
    }

    const result = await pool.query(
      `INSERT INTO products 
       (name, description, product_code, category, model, is_active, is_bestseller, is_trending, is_offer, is_festive, allow_reviews, variants, details, reviews, image_url, images, slug, short_description, price, stock, vendor_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21) RETURNING *`,
      [
        name, description, product_code, category, model, 
        is_active ?? true, is_bestseller ?? false, is_trending ?? false, is_offer ?? false, is_festive ?? false, allow_reviews ?? true,
        JSON.stringify(variants || []), JSON.stringify(details || []), JSON.stringify(reviews || []), 
        image_url, JSON.stringify(images || []), slug, short_description, price, stock, vendor_id || null
      ]
    );
    res.json({ product: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/products/:id', authMiddleware, adminOnly, async (req, res) => {
  const { 
    name, description, product_code, category, model, is_active, 
    is_bestseller, is_trending, is_offer, is_festive, allow_reviews, 
    variants, details, reviews, image_url, images, slug, short_description, vendor_id 
  } = req.body;
  try {
    let price = 0;
    let stock = 0;
    if (variants && variants.length > 0) {
      if (variants[0].sizes && variants[0].sizes.length > 0) {
        price = variants[0].sizes[0].our_price || variants[0].sizes[0].mrp || 0;
        stock = variants.reduce((acc, v) => acc + (v.sizes || []).reduce((sAcc, s) => sAcc + (Number(s.stock) || 0), 0), 0);
      }
    }

    const result = await pool.query(
      `UPDATE products SET 
        name=$1, description=$2, product_code=$3, category=$4, model=$5, 
        is_active=$6, is_bestseller=$7, is_trending=$8, is_offer=$9, is_festive=$10, allow_reviews=$11, 
        variants=$12, details=$13, reviews=$14, image_url=$15, images=$16, slug=$17, short_description=$18, price=$19, stock=$20, vendor_id=$21
       WHERE id=$22 RETURNING *`,
      [
        name, description, product_code, category, model, 
        is_active ?? true, is_bestseller ?? false, is_trending ?? false, is_offer ?? false, is_festive ?? false, allow_reviews ?? true,
        JSON.stringify(variants || []), JSON.stringify(details || []), JSON.stringify(reviews || []), 
        image_url, JSON.stringify(images || []), slug, short_description, price, stock, vendor_id || null, req.params.id
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ product: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/products/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id=$1', [req.params.id]);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Banners ---
router.get('/banners', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM banners ORDER BY created_at DESC');
    res.json({ banners: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/banners', authMiddleware, adminOnly, async (req, res) => {
  const { title, image_url, link_url, is_active } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO banners (title, image_url, link_url, is_active) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, image_url, link_url, is_active ?? true]
    );
    res.json({ banner: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/banners/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM banners WHERE id=$1', [req.params.id]);
    res.json({ message: 'Banner deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Coupons ---
router.get('/coupons', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
    res.json({ coupons: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/coupons', authMiddleware, adminOnly, async (req, res) => {
  const { code, type, discount_type, value, discount_value, restriction_type, restriction_value, min_order_value, usage, usage_type, is_active, expires_at } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO coupons (code, discount_type, discount_value, min_order_value, is_active, expires_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [
        code,
        discount_type || type || 'percentage',
        discount_value || value,
        min_order_value || restriction_value || 0,
        is_active ?? true,
        expires_at || null
      ]
    );
    res.json({ coupon: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/coupons/:id', authMiddleware, adminOnly, async (req, res) => {
  const { code, type, discount_type, value, discount_value, restriction_type, restriction_value, min_order_value, usage, is_active, expires_at } = req.body;
  try {
    const result = await pool.query(
      'UPDATE coupons SET code=$1, discount_type=$2, discount_value=$3, min_order_value=$4, is_active=$5, expires_at=$6 WHERE id=$7 RETURNING *',
      [
        code,
        discount_type || type || 'percentage',
        discount_value || value,
        min_order_value || restriction_value || 0,
        is_active ?? true,
        expires_at || null,
        req.params.id
      ]
    );
    res.json({ coupon: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/coupons/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM coupons WHERE id=$1', [req.params.id]);
    res.json({ message: 'Coupon deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CATEGORIES ---

// GET /api/admin/categories
router.get('/categories', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY id ASC');
    res.json({ categories: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/categories
router.post('/categories', authMiddleware, adminOnly, async (req, res) => {
  const { name, models, image_url, banner_url, custom_fields, subcategories } = req.body;
  try {
    const modelsJson = Array.isArray(models) ? JSON.stringify(models) : '[]';
    const fieldsJson = Array.isArray(custom_fields) ? JSON.stringify(custom_fields) : '[]';
    const subsJson = Array.isArray(subcategories) ? JSON.stringify(subcategories) : '[]';
    const result = await pool.query(
      'INSERT INTO categories (name, models, image_url, banner_url, custom_fields, subcategories) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, modelsJson, image_url, banner_url || null, fieldsJson, subsJson]
    );
    res.json({ category: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/categories/:id
router.put('/categories/:id', authMiddleware, adminOnly, async (req, res) => {
  const { name, models, image_url, banner_url, custom_fields, subcategories } = req.body;
  try {
    const modelsJson = Array.isArray(models) ? JSON.stringify(models) : '[]';
    const fieldsJson = Array.isArray(custom_fields) ? JSON.stringify(custom_fields) : '[]';
    const subsJson = Array.isArray(subcategories) ? JSON.stringify(subcategories) : '[]';
    const result = await pool.query(
      'UPDATE categories SET name=$1, models=$2, image_url=$3, banner_url=$4, custom_fields=$5, subcategories=$6 WHERE id=$7 RETURNING *',
      [name, modelsJson, image_url, banner_url || null, fieldsJson, subsJson, req.params.id]
    );
    res.json({ category: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/categories/:id
router.delete('/categories/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM categories WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- VENDORS ---
router.get('/vendors', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, store_name, email, phone, address, status, wallet_balance, created_at FROM vendors ORDER BY created_at DESC');
    res.json({ vendors: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/vendors/:id/status', authMiddleware, adminOnly, async (req, res) => {
  const { status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE vendors SET status=$1 WHERE id=$2 RETURNING id, name, store_name, email, status',
      [status, req.params.id]
    );
    res.json({ vendor: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/vendor-products', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, v.store_name, v.email as vendor_email 
      FROM products p 
      JOIN vendors v ON p.vendor_id = v.id 
      ORDER BY p.created_at DESC
    `);
    res.json({ products: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/vendor-orders', authMiddleware, adminOnly, async (req, res) => {
  try {
    // Fetch all orders and filter those that contain vendor products
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    const vendorOrders = [];

    result.rows.forEach(order => {
      let items = [];
      try { items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []); } catch(e) {}
      
      const vendorItems = items.filter(item => item.product && item.product.vendor_id);
      if (vendorItems.length > 0) {
        order.vendor_items = vendorItems;
        order.vendors_involved = [...new Set(vendorItems.map(i => i.product.vendor_id))];
        vendorOrders.push(order);
      }
    });

    res.json({ orders: vendorOrders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/vendors/:id/payout', authMiddleware, adminOnly, async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

  try {
    // Deduct amount from vendor wallet
    const vendorRes = await pool.query('SELECT wallet_balance FROM vendors WHERE id=$1', [req.params.id]);
    if (vendorRes.rows.length === 0) return res.status(404).json({ error: 'Vendor not found' });
    
    let currentBalance = parseFloat(vendorRes.rows[0].wallet_balance) || 0;
    if (currentBalance < amount) return res.status(400).json({ error: 'Insufficient wallet balance' });

    const result = await pool.query(
      'UPDATE vendors SET wallet_balance = wallet_balance - $1 WHERE id = $2 RETURNING id, name, wallet_balance',
      [amount, req.params.id]
    );

    // Record the payout transaction
    await pool.query(
      'INSERT INTO vendor_transactions (vendor_id, type, amount, description) VALUES ($1, $2, $3, $4)',
      [req.params.id, 'debit', amount, `Payout of ₹${parseFloat(amount).toLocaleString()} processed to bank account`]
    );

    res.json({ message: 'Payout successful', vendor: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/vendor-payouts - All vendor transactions for admin
router.get('/vendor-payouts', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT vt.*, v.name as vendor_name, v.store_name 
      FROM vendor_transactions vt 
      LEFT JOIN vendors v ON vt.vendor_id = v.id 
      ORDER BY vt.created_at DESC
    `);
    res.json({ payouts: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SUPPORT AGENTS ---
const bcrypt = require('bcryptjs');

// GET /api/admin/support-agents  (scope=admin only)
router.get('/support-agents', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, is_active, created_at, access_pages FROM support_agents WHERE scope='admin' ORDER BY created_at DESC"
    );
    res.json({ agents: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/support-agents
router.post('/support-agents', authMiddleware, adminOnly, async (req, res) => {
  const { name, email, password, access_pages } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password required' });
  try {
    const existing = await pool.query('SELECT id FROM support_agents WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Email already exists' });
    const password_hash = await bcrypt.hash(password, 10);
    const pages = Array.isArray(access_pages) ? JSON.stringify(access_pages) : '[]';
    const result = await pool.query(
      "INSERT INTO support_agents (name, email, password_hash, scope, access_pages) VALUES ($1, $2, $3, 'admin', $4) RETURNING id, name, email, is_active, created_at, access_pages",
      [name, email, password_hash, pages]
    );
    res.json({ agent: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/support-agents/:id/toggle
router.put('/support-agents/:id/toggle', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE support_agents SET is_active = NOT is_active WHERE id = $1 AND scope='admin' RETURNING id, name, email, is_active, access_pages",
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Agent not found' });
    res.json({ agent: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/support-agents/:id
router.delete('/support-agents/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await pool.query("DELETE FROM support_agents WHERE id = $1 AND scope='admin'", [req.params.id]);
    res.json({ message: 'Agent deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- PRODUCT REQUESTS (Vendor product approvals) ---

// GET /api/admin/product-requests
router.get('/product-requests', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, v.name as vendor_name, v.store_name
       FROM products p
       LEFT JOIN vendors v ON p.vendor_id = v.id
       WHERE p.status = 'pending'
       ORDER BY p.created_at DESC`
    );
    res.json({ products: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/product-requests/:id/approve
router.put('/product-requests/:id/approve', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE products SET status = 'approved', is_active = true WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ product: result.rows[0], message: 'Product approved and is now live.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/product-requests/:id/reject
router.put('/product-requests/:id/reject', authMiddleware, adminOnly, async (req, res) => {
  const { reason } = req.body;
  try {
    const result = await pool.query(
      `UPDATE products SET status = 'rejected', is_active = false WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ product: result.rows[0], message: 'Product rejected.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

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
  const { name, slug, short_description, description, category, image_url, images, custom_attributes, vendor_id, variants } = req.body;
  
  try {
    const attrs = custom_attributes || {};
    let price = 0;
    let stock = 0;
    
    for (const key of Object.keys(attrs)) {
      if (key.toLowerCase().includes('price')) price = parseFloat(attrs[key]) || price;
      if (key.toLowerCase().includes('stock') || key.toLowerCase() === 'quantity') stock = parseInt(attrs[key]) || stock;
    }

    const result = await pool.query(
      `INSERT INTO products 
       (name, slug, short_description, description, category, image_url, images, sizes, custom_attributes, price, stock, vendor_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [name, slug, short_description, description, category, image_url, JSON.stringify(images || []), JSON.stringify(variants || []), JSON.stringify(attrs), price, stock, vendor_id || null]
    );
    res.json({ product: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/products/:id', authMiddleware, adminOnly, async (req, res) => {
  const { name, slug, short_description, description, category, image_url, images, custom_attributes, vendor_id, variants } = req.body;
  try {
    const attrs = custom_attributes || {};
    let price = 0;
    let stock = 0;
    
    for (const key of Object.keys(attrs)) {
      if (key.toLowerCase().includes('price')) price = parseFloat(attrs[key]) || price;
      if (key.toLowerCase().includes('stock') || key.toLowerCase() === 'quantity') stock = parseInt(attrs[key]) || stock;
    }

    const result = await pool.query(
      'UPDATE products SET name=$1, slug=$2, short_description=$3, description=$4, category=$5, image_url=$6, images=$7, sizes=$8, custom_attributes=$9, price=$10, stock=$11, vendor_id=$12 WHERE id=$13 RETURNING *',
      [name, slug, short_description, description, category, image_url, JSON.stringify(images || []), JSON.stringify(variants || []), JSON.stringify(attrs), price, stock, vendor_id || null, req.params.id]
    );
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
  const { code, discount_type, discount_value, min_order_value, is_active, expires_at } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO coupons (code, discount_type, discount_value, min_order_value, is_active, expires_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [code, discount_type || 'percentage', discount_value, min_order_value || 0, is_active ?? true, expires_at]
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
  const { name, models, image_url, custom_fields } = req.body;
  try {
    const modelsJson = Array.isArray(models) ? JSON.stringify(models) : '[]';
    const fieldsJson = Array.isArray(custom_fields) ? JSON.stringify(custom_fields) : '[]';
    const result = await pool.query(
      'INSERT INTO categories (name, models, image_url, custom_fields) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, modelsJson, image_url, fieldsJson]
    );
    res.json({ category: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/categories/:id
router.put('/categories/:id', authMiddleware, adminOnly, async (req, res) => {
  const { name, models, image_url, custom_fields } = req.body;
  try {
    const modelsJson = Array.isArray(models) ? JSON.stringify(models) : '[]';
    const fieldsJson = Array.isArray(custom_fields) ? JSON.stringify(custom_fields) : '[]';
    const result = await pool.query(
      'UPDATE categories SET name=$1, models=$2, image_url=$3, custom_fields=$4 WHERE id=$5 RETURNING *',
      [name, modelsJson, image_url, fieldsJson, req.params.id]
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

module.exports = router;

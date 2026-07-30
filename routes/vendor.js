const router = require('express').Router();
const pool = require('../db');
const { vendorAuthMiddleware } = require('./vendorAuth');

router.use(vendorAuthMiddleware);

// --- Stats ---
router.get('/stats', async (req, res) => {
  try {
    const productsRes = await pool.query('SELECT COUNT(*) FROM products WHERE vendor_id = $1', [req.vendorId]);
    
    // For vendor orders, we look at orders that have items with this vendor's ID.
    // In PostgreSQL, you can use jsonb array elements to query.
    // Alternatively, just query orders and filter in JS if it's simpler and not too large.
    const ordersRes = await pool.query(`
      SELECT o.total, o.items 
      FROM orders o 
      WHERE o.status != 'cancelled'
    `);
    
    let totalVendorOrders = 0;
    let totalVendorRevenue = 0;

    ordersRes.rows.forEach(order => {
      let items = [];
      try { items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []); } catch(e) {}
      
      let hasVendorItem = false;
      items.forEach(item => {
        // If product has vendor_id, match it. Assuming items store product details including vendor_id, 
        // or we need to join products on order creation. For now, rely on product.vendor_id in JSON
        if (item.product && item.product.vendor_id === req.vendorId) {
          hasVendorItem = true;
          totalVendorRevenue += parseFloat(item.qty * (item.variant?.price || item.product?.price || 0));
        }
      });
      if (hasVendorItem) totalVendorOrders++;
    });

    res.json({
      totalProducts: parseInt(productsRes.rows[0].count),
      totalOrders: totalVendorOrders,
      totalRevenue: totalVendorRevenue
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Products ---
router.get('/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE vendor_id = $1 ORDER BY created_at DESC', [req.vendorId]);
    res.json({ products: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/products', async (req, res) => {
  const { name, slug, short_description, description, category, image_url, images, custom_attributes, variants } = req.body;

  try {
    // Extract generic price and stock from custom_attributes for quick indexing if present
    const attrs = custom_attributes || {};
    
    // Attempt to find something named "Price" or "Stock"
    let price = 0;
    let stock = 0;
    
    for (const key of Object.keys(attrs)) {
      if (key.toLowerCase().includes('price')) {
        price = parseFloat(attrs[key]) || price;
      }
      if (key.toLowerCase().includes('stock') || key.toLowerCase() === 'quantity') {
        stock = parseInt(attrs[key]) || stock;
      }
    }

    const result = await pool.query(
      `INSERT INTO products (
        name, slug, short_description, description, category, image_url, images, sizes, vendor_id, price, stock, custom_attributes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      ) RETURNING *`,
      [
        name, slug, short_description, description, category, image_url, JSON.stringify(images || []), JSON.stringify(variants || []), req.vendorId, price, stock,
        JSON.stringify(attrs)
      ]
    );
    res.json({ product: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/products/:id', async (req, res) => {
  const { name, slug, short_description, description, category, image_url, images, custom_attributes, variants } = req.body;
  try {
    // Ensure product belongs to vendor
    const check = await pool.query('SELECT id FROM products WHERE id=$1 AND vendor_id=$2', [req.params.id, req.vendorId]);
    if (check.rows.length === 0) return res.status(403).json({ error: 'Not authorized or product not found' });

    const attrs = custom_attributes || {};
    let price = 0;
    let stock = 0;
    for (const key of Object.keys(attrs)) {
      if (key.toLowerCase().includes('price')) price = parseFloat(attrs[key]) || price;
      if (key.toLowerCase().includes('stock') || key.toLowerCase() === 'quantity') stock = parseInt(attrs[key]) || stock;
    }
    
    const result = await pool.query(
      'UPDATE products SET name=$1, slug=$2, short_description=$3, description=$4, category=$5, image_url=$6, images=$7, sizes=$8, custom_attributes=$9, price=$10, stock=$11 WHERE id=$12 RETURNING *',
      [name, slug, short_description, description, category, image_url, JSON.stringify(images || []), JSON.stringify(variants || []), JSON.stringify(attrs), price, stock, req.params.id]
    );
    res.json({ product: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    const check = await pool.query('SELECT id FROM products WHERE id=$1 AND vendor_id=$2', [req.params.id, req.vendorId]);
    if (check.rows.length === 0) return res.status(403).json({ error: 'Not authorized or product not found' });

    await pool.query('DELETE FROM products WHERE id=$1', [req.params.id]);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Orders ---
router.get('/orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    const vendorOrders = [];

    result.rows.forEach(order => {
      let items = [];
      try { items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []); } catch(e) {}
      
      const vendorItems = items.filter(item => item.product && item.product.vendor_id === req.vendorId);
      if (vendorItems.length > 0) {
        order.items = vendorItems; // Only show their items
        // Recalculate order total for this vendor
        order.total = vendorItems.reduce((acc, item) => acc + (item.qty * (item.variant?.price || item.product?.price || 0)), 0);
        vendorOrders.push(order);
      }
    });

    res.json({ orders: vendorOrders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Categories ---
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY id ASC');
    res.json({ categories: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Vendor Transactions (Payout History) ---
router.get('/transactions', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM vendor_transactions WHERE vendor_id = $1 ORDER BY created_at DESC',
      [req.vendorId]
    );
    res.json({ transactions: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Vendor Support Agents ---
const bcrypt = require('bcryptjs');

// GET /api/vendor/support-agents
router.get('/support-agents', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, is_active, created_at FROM support_agents WHERE scope='vendor' AND vendor_id=$1 ORDER BY created_at DESC",
      [req.vendorId]
    );
    res.json({ agents: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vendor/support-agents
router.post('/support-agents', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password required' });
  try {
    const existing = await pool.query('SELECT id FROM support_agents WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Email already exists' });
    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO support_agents (name, email, password_hash, scope, vendor_id) VALUES ($1, $2, $3, 'vendor', $4) RETURNING id, name, email, is_active, created_at",
      [name, email, password_hash, req.vendorId]
    );
    res.json({ agent: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/vendor/support-agents/:id/toggle
router.put('/support-agents/:id/toggle', async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE support_agents SET is_active = NOT is_active WHERE id=$1 AND scope='vendor' AND vendor_id=$2 RETURNING id, name, email, is_active",
      [req.params.id, req.vendorId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Agent not found' });
    res.json({ agent: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/vendor/support-agents/:id
router.delete('/support-agents/:id', async (req, res) => {
  try {
    await pool.query("DELETE FROM support_agents WHERE id=$1 AND scope='vendor' AND vendor_id=$2", [req.params.id, req.vendorId]);
    res.json({ message: 'Agent deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

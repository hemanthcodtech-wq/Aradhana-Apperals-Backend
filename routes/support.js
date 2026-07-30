const router = require('express').Router();
const pool = require('../db');
const { supportAuthMiddleware } = require('./supportAuth');

router.use(supportAuthMiddleware);

// GET /api/support/orders
router.get('/orders', async (req, res) => {
  try {
    let result;
    if (req.scope === 'vendor' && req.agentVendorId) {
      // Fetch all orders then filter to only those containing this vendor's products
      const all = await pool.query(
        `SELECT o.*, u.name as user_name, u.email as user_email, u.phone as user_phone
         FROM orders o LEFT JOIN users u ON o.user_id = u.id
         ORDER BY o.created_at DESC`
      );
      const vendorId = req.agentVendorId;
      const filtered = [];
      all.rows.forEach(order => {
        let items = [];
        try { items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []); } catch(e) {}
        const vendorItems = items.filter(i => i.product && i.product.vendor_id === vendorId);
        if (vendorItems.length > 0) {
          filtered.push({
            ...order,
            items: vendorItems,
            total: vendorItems.reduce((s, i) => s + i.qty * (i.variant?.price || i.product?.price || 0), 0),
          });
        }
      });
      return res.json({ orders: filtered });
    }
    // admin scope — all orders
    result = await pool.query(
      `SELECT o.*, u.name as user_name, u.email as user_email, u.phone as user_phone
       FROM orders o LEFT JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC`
    );
    res.json({ orders: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/support/products
router.get('/products', async (req, res) => {
  try {
    let result;
    if (req.scope === 'vendor' && req.agentVendorId) {
      result = await pool.query(
        `SELECT p.*, c.name as category_name
         FROM products p LEFT JOIN categories c ON p.category = c.name
         WHERE p.vendor_id = $1
         ORDER BY p.created_at DESC`,
        [req.agentVendorId]
      );
    } else {
      result = await pool.query(
        `SELECT p.*, c.name as category_name
         FROM products p LEFT JOIN categories c ON p.category = c.name
         ORDER BY p.created_at DESC`
      );
    }
    res.json({ products: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/support/categories
router.get('/categories', async (req, res) => {
  try {
    let result;
    if (req.scope === 'vendor' && req.agentVendorId) {
      // Only categories that have at least one product from this vendor
      result = await pool.query(
        `SELECT c.*, COUNT(p.id)::int as product_count
         FROM categories c
         INNER JOIN products p ON p.category = c.name AND p.vendor_id = $1
         GROUP BY c.id
         ORDER BY c.id ASC`,
        [req.agentVendorId]
      );
    } else {
      result = await pool.query(
        `SELECT c.*, COUNT(p.id)::int as product_count
         FROM categories c LEFT JOIN products p ON p.category = c.name
         GROUP BY c.id ORDER BY c.id ASC`
      );
    }
    res.json({ categories: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

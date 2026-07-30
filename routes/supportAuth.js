const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// Auth Middleware for Support Agents
const supportAuthMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'support') return res.status(403).json({ error: 'Support access only' });
    req.agentId = decoded.id;
    req.scope = decoded.scope || 'admin';
    req.agentVendorId = decoded.vendor_id || null;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// POST /api/supportAuth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const result = await pool.query('SELECT * FROM support_agents WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'Invalid credentials' });

    const agent = result.rows[0];
    if (!agent.is_active) return res.status(403).json({ error: 'Account is inactive. Contact admin.' });

    const match = await bcrypt.compare(password, agent.password_hash);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: agent.id, role: 'support', scope: agent.scope, vendor_id: agent.vendor_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, agent: { id: agent.id, name: agent.name, email: agent.email, scope: agent.scope, vendor_id: agent.vendor_id } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/supportAuth/me
router.get('/me', supportAuthMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, scope, vendor_id, is_active, created_at FROM support_agents WHERE id = $1',
      [req.agentId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Agent not found' });
    res.json({ agent: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, supportAuthMiddleware };

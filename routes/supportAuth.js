const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendSupportPasswordResetOTPEmail(email, otp, name) {
  await transporter.sendMail({
    from: `"Zesto Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Support Password Reset OTP',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #036e26;border-radius:12px;">
        <h2 style="color:#036e26;">Support Password Reset Request</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Your OTP to reset your password is:</p>
        <div style="font-size:36px;font-weight:bold;color:#036e26;letter-spacing:8px;text-align:center;padding:16px;background:#f0fdf4;border-radius:8px;margin:16px 0;">
          ${otp}
        </div>
        <p style="color:#6b7280;font-size:13px;">This OTP is valid for 10 minutes. Do not share it with anyone.</p>
      </div>
    `,
  });
}

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

// POST /api/supportAuth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const agent = await pool.query('SELECT name FROM support_agents WHERE email=$1', [email]);
    if (!agent.rows.length) return res.status(404).json({ error: 'Agent not found' });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query('DELETE FROM otps WHERE email=$1', [email]);
    await pool.query('INSERT INTO otps (email, otp, expires_at) VALUES ($1,$2,$3)', [email, otp, expiresAt]);

    await sendSupportPasswordResetOTPEmail(email, otp, agent.rows[0].name);
    res.json({ message: 'OTP sent to your email' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/supportAuth/verify-reset-otp
router.post('/verify-reset-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

  try {
    const result = await pool.query(
      'SELECT * FROM otps WHERE email=$1 AND otp=$2 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [email, otp]
    );
    if (!result.rows.length) return res.status(400).json({ error: 'Invalid or expired OTP' });
    res.json({ success: true, message: 'OTP verified' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/supportAuth/reset-password
router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) return res.status(400).json({ error: 'Missing required fields' });

  try {
    const result = await pool.query(
      'SELECT * FROM otps WHERE email=$1 AND otp=$2 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [email, otp]
    );
    if (!result.rows.length) return res.status(400).json({ error: 'Invalid or expired OTP' });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE support_agents SET password_hash=$1 WHERE email=$2', [hash, email]);
    await pool.query('DELETE FROM otps WHERE email=$1', [email]);

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/supportAuth/me
router.get('/me', supportAuthMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, scope, vendor_id, is_active, created_at, access_pages FROM support_agents WHERE id = $1',
      [req.agentId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Agent not found' });
    res.json({ agent: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, supportAuthMiddleware };

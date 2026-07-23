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

async function sendOTPEmail(email, otp, name) {
  await transporter.sendMail({
    from: `"Indbasket Vendor" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your OTP for Vendor Signup',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #fe6603;border-radius:12px;">
        <h2 style="color:#fe6603;">Welcome to Indbasket Vendor Portal</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Your OTP for verifying your vendor application is:</p>
        <div style="font-size:36px;font-weight:bold;color:#ea580c;letter-spacing:8px;text-align:center;padding:16px;background:#fff7ed;border-radius:8px;margin:16px 0;">
          ${otp}
        </div>
        <p style="color:#6b7280;font-size:13px;">This OTP is valid for 10 minutes. Do not share it with anyone.</p>
      </div>
    `,
  });
}


// Registration
router.post('/signup', async (req, res) => {
  const { name, store_name, email, phone, password, address } = req.body;
  if (!email || !password || !store_name) return res.status(400).json({ error: 'Missing required fields' });

  try {
    const check = await pool.query('SELECT id, status FROM vendors WHERE email = $1', [email]);
    if (check.rows.length > 0) {
      if (check.rows[0].status !== 'unverified') {
        return res.status(400).json({ error: 'Email already exists and is verified/pending.' });
      }
    }

    const password_hash = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    if (check.rows.length > 0) {
      await pool.query(
        'UPDATE vendors SET name=$1, store_name=$2, phone=$3, password_hash=$4, address=$5 WHERE email=$6',
        [name, store_name, phone, password_hash, address, email]
      );
    } else {
      await pool.query(
        `INSERT INTO vendors (name, store_name, email, phone, password_hash, address, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'unverified')`,
        [name, store_name, email, phone, password_hash, address]
      );
    }

    await pool.query('DELETE FROM otps WHERE email=$1', [email]);
    await pool.query('INSERT INTO otps (email, otp, expires_at) VALUES ($1,$2,$3)', [email, otp, expiresAt]);

    await sendOTPEmail(email, otp, name);
    res.json({ message: 'OTP sent to your email successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

  try {
    const result = await pool.query(
      'SELECT * FROM otps WHERE email=$1 AND otp=$2 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [email, otp]
    );
    if (!result.rows.length) return res.status(400).json({ error: 'Invalid or expired OTP' });

    // Update vendor status to pending (awaiting admin approval)
    await pool.query("UPDATE vendors SET status='pending' WHERE email=$1", [email]);
    await pool.query('DELETE FROM otps WHERE email=$1', [email]);

    res.json({ message: 'Application verified. Awaiting admin approval.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM vendors WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'Invalid credentials' });

    const vendor = result.rows[0];
    const match = await bcrypt.compare(password, vendor.password_hash);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });

    if (vendor.status === 'pending') {
      return res.status(403).json({ error: 'The application is under review. Once admin approves you can login here.' });
    }
    if (vendor.status === 'rejected') {
      return res.status(403).json({ error: 'Your vendor application has been rejected by the admin.' });
    }
    if (vendor.status === 'unverified') {
      return res.status(403).json({ error: 'Please verify your email via the OTP sent during signup before logging in.' });
    }

    const token = jwt.sign({ id: vendor.id, role: 'vendor' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, vendor: { id: vendor.id, name: vendor.name, email: vendor.email, store_name: vendor.store_name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Auth Middleware for Vendors
const vendorAuthMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'vendor') return res.status(403).json({ error: 'Vendor access only' });
    req.vendorId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get current vendor
router.get('/me', vendorAuthMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, store_name, email, phone, address, status, wallet_balance, created_at FROM vendors WHERE id = $1', [req.vendorId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Vendor not found' });
    res.json({ vendor: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, vendorAuthMiddleware };

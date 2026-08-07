const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: function (origin, callback) {
    // Allow all vercel.app subdomains, localhost, and any custom domain set via env
    const allowed = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://indbasket.vercel.app',
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    if (!origin || allowed.includes(origin) || /\.vercel\.app$/.test(origin)) {
      callback(null, origin || '*');
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

const path = require('path');

app.use('/api/general', require('./routes/general'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/admin/upload', require('./routes/upload'));
app.use('/api/vendorAuth', require('./routes/vendorAuth').router);
app.use('/api/vendor', require('./routes/vendor'));
app.use('/api/supportAuth', require('./routes/supportAuth').router);
app.use('/api/support', require('./routes/support'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/offers', require('./routes/offers'));
app.use('/api/advertisements', require('./routes/advertisements'));

app.use((req, res) => res.status(404).json({ error: 'API route not found' }));

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

module.exports = app;

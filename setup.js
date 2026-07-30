const pool = require('./db');

async function setup() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150),
      email VARCHAR(150) UNIQUE NOT NULL,
      phone VARCHAR(20),
      password_hash VARCHAR(255),
      is_verified BOOLEAN DEFAULT FALSE,
      role VARCHAR(20) DEFAULT 'user',
      avatar_url TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';

    CREATE TABLE IF NOT EXISTS vendors (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150),
      store_name VARCHAR(150),
      email VARCHAR(150) UNIQUE NOT NULL,
      phone VARCHAR(20),
      password_hash VARCHAR(255),
      address TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      wallet_balance NUMERIC(10,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS otps (
      id SERIAL PRIMARY KEY,
      email VARCHAR(150) NOT NULL,
      otp VARCHAR(6) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS addresses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(150),
      line1 TEXT,
      line2 TEXT,
      city VARCHAR(100),
      state VARCHAR(100),
      pincode VARCHAR(10),
      mobile VARCHAR(20),
      is_default BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      order_number VARCHAR(50) UNIQUE,
      status VARCHAR(50) DEFAULT 'pending',
      total NUMERIC(10,2),
      items JSONB,
      address JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      stock INTEGER DEFAULT 0,
      sizes JSONB DEFAULT '[]',
      color VARCHAR(100),
      images JSONB DEFAULT '[]',
      image_url TEXT,
      category VARCHAR(100),
      model VARCHAR(150),
      is_active BOOLEAN DEFAULT TRUE,
      is_bestseller BOOLEAN DEFAULT FALSE,
      is_trending BOOLEAN DEFAULT FALSE,
      is_offer BOOLEAN DEFAULT FALSE,
      badge VARCHAR(100),
      spice_level INTEGER DEFAULT 0,
      price_unit VARCHAR(50),
      price NUMERIC(10,2),
      mrp NUMERIC(10,2),
      coupon_applicable BOOLEAN DEFAULT TRUE,
      sku VARCHAR(100),
      slug VARCHAR(255) UNIQUE,
      short_description TEXT,
      brand VARCHAR(150),
      subcategory VARCHAR(150),
      stock_status VARCHAR(50) DEFAULT 'In Stock',
      status VARCHAR(50) DEFAULT 'Published',
      discount_percent NUMERIC(5,2),
      cost_price NUMERIC(10,2),
      gst_percent NUMERIC(5,2),
      hsn_code VARCHAR(50),
      low_stock_alert INTEGER DEFAULT 10,
      min_order_qty INTEGER DEFAULT 1,
      max_order_qty INTEGER,
      weight VARCHAR(50),
      length VARCHAR(50),
      width VARCHAR(50),
      height VARCHAR(50),
      material VARCHAR(100),
      barcode VARCHAR(100),
      warranty VARCHAR(100),
      return_policy VARCHAR(255),
      replacement_policy VARCHAR(255),
      shipping_charge NUMERIC(10,2),
      free_shipping BOOLEAN DEFAULT FALSE,
      cod_available BOOLEAN DEFAULT FALSE,
      custom_attributes JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    );

    ALTER TABLE products ADD COLUMN IF NOT EXISTS vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL;

    CREATE TABLE IF NOT EXISTS banners (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255),
      image_url TEXT NOT NULL,
      link_url TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id SERIAL PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      discount_type VARCHAR(20) DEFAULT 'percentage',
      discount_value NUMERIC(10,2) NOT NULL,
      min_order_value NUMERIC(10,2) DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      models JSONB DEFAULT '[]',
      custom_fields JSONB DEFAULT '[]',
      image_url TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS offers (
      id SERIAL PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      discount_percent NUMERIC(5,2) NOT NULL,
      scope VARCHAR(20) DEFAULT 'all',
      category_ids JSONB DEFAULT '[]',
      product_ids JSONB DEFAULT '[]',
      min_type VARCHAR(10) DEFAULT 'amount',
      min_value NUMERIC(10,2) DEFAULT 0,
      usage_type VARCHAR(20) DEFAULT 'multiple',
      expires_at TIMESTAMP,
      is_active BOOLEAN DEFAULT TRUE,
      created_by VARCHAR(20) DEFAULT 'admin',
      vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS offer_usages (
      id SERIAL PRIMARY KEY,
      offer_id INTEGER REFERENCES offers(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      used_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(offer_id, user_id)
    );
  `);
  console.log('✅ Tables created');

  // Seed admin user
  const bcrypt = require('bcryptjs');
  const adminEmail = 'admin@mokshamandir.com';
  const adminPass = await bcrypt.hash('Admin@1234', 10);
  await pool.query(`
    INSERT INTO users (name, email, phone, password_hash, is_verified, role)
    VALUES ('Admin', $1, '+91 00000 00000', $2, TRUE, 'admin')
    ON CONFLICT (email) DO UPDATE SET role='admin', is_verified=TRUE, password_hash=$2
  `, [adminEmail, adminPass]);
  console.log('✅ Admin seeded → email: admin@mokshamandir.com | password: Admin@1234');
  process.exit(0);
}

setup().catch(err => { console.error('❌', err.message); process.exit(1); });

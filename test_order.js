const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function placeOrder() {
  try {
    const res = await pool.query("SELECT * FROM products WHERE name ILIKE '%Iphone 18%' LIMIT 1");
    let product = res.rows[0];
    if (!product) {
      const res2 = await pool.query('SELECT * FROM products WHERE is_active = true LIMIT 1');
      product = res2.rows[0];
    }
    if (!product) { console.log('No active products found'); process.exit(1); }

    let variants = [];
    try { variants = typeof product.sizes === 'string' ? JSON.parse(product.sizes) : product.sizes; } catch(e) {}
    const variant = (variants && variants.length > 0) ? variants[0] : { size: "6gb/128gb", price: product.price || 100, color: "Black" };
    if (!variant.color) variant.color = "Space Grey";

    const payload = {
      items: [{ product: product, variant: variant, qty: 1 }],
      address: {
        name: "Hemanth Kancharla",
        mobile: "9876543210",
        addressLine1: "123 Tech Lane",
        addressLine2: "Apt 4B",
        city: "Hyderabad",
        state: "Telangana",
        pincode: "500081"
      },
      total: parseFloat(variant.price) || parseFloat(product.price) || 0,
      payment_method: 'cod'
    };

    const http = require('http');
    const options = { hostname: 'localhost', port: 5000, path: '/api/general/orders', method: 'POST', headers: { 'Content-Type': 'application/json' } };
    const req = http.request(options, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => { console.log('Response:', data); process.exit(0); });
    });
    req.on('error', (e) => { console.error(`Error: ${e.message}`); process.exit(1); });
    req.write(JSON.stringify(payload));
    req.end();
  } catch(e) { console.error(e); process.exit(1); }
}
placeOrder();

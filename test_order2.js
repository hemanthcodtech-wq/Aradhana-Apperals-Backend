const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function placeOrder() {
  try {
    const res = await pool.query("SELECT * FROM products WHERE name ILIKE '%Iphone 18%' LIMIT 1");
    let product = res.rows[0];
    const variant = { color: "Midnight Blue", size: "8gb/256gb", price: 19000 };
    
    const payload = {
      items: [{ product: product, variant: variant, qty: 1 }],
      address: {
        name: "Hemanth Kancharla",
        mobile: "9876543210",
        addressLine1: "123 Tech Lane",
        city: "Hyderabad",
        state: "Telangana",
        pincode: "500081"
      },
      total: 19000,
      payment_method: 'cod'
    };

    const http = require('http');
    const options = { hostname: 'localhost', port: 5000, path: '/api/general/orders', method: 'POST', headers: { 'Content-Type': 'application/json' } };
    const req = http.request(options, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => { console.log('Response:', data); process.exit(0); });
    });
    req.write(JSON.stringify(payload));
    req.end();
  } catch(e) {}
}
placeOrder();

require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function test() {
  const subs = ["Smartphones", "Feature Phones"];
  const subsJson = JSON.stringify(subs);
  console.log("subsJson", subsJson);

  try {
    const res = await pool.query(
      'UPDATE categories SET subcategories=$1 WHERE id=$2 RETURNING id, name, subcategories',
      [subsJson, 2]
    );
    console.log("Result:", res.rows[0]);
  } catch (err) {
    console.error("Error:", err.message);
  }
  pool.end();
}
test();

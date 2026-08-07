require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function test() {
  try {
    const resStringified = await pool.query(
      'UPDATE categories SET subcategories=$1 WHERE id=$2 RETURNING subcategories',
      [JSON.stringify(["A", "B"]), 2]
    );
    console.log("Stringified type:", typeof resStringified.rows[0].subcategories, resStringified.rows[0].subcategories);

    const resArray = await pool.query(
      'UPDATE categories SET subcategories=$1 WHERE id=$2 RETURNING subcategories',
      [["C", "D"], 2]
    );
    console.log("Array type:", typeof resArray.rows[0].subcategories, resArray.rows[0].subcategories);
  } catch (err) {
    console.error("Error:", err.message);
  }
  pool.end();
}
test();

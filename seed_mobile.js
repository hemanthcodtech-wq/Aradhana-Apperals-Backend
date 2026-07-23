const pool = require('./db.js');

async function run() {
  try {
    const res = await pool.query("SELECT * FROM categories WHERE name ILIKE 'mobile%' LIMIT 1");
    let catId;
    if (res.rows.length === 0) {
      console.log('Mobile category not found. Creating one.');
      const insert = await pool.query(
        "INSERT INTO categories (name, custom_fields) VALUES ($1, $2) RETURNING id",
        ['Mobiles', JSON.stringify([
          { name: 'Product Name', type: 'text', required: true },
          { name: 'Price', type: 'number', required: true },
          { name: 'Stock', type: 'number', required: true },
          { name: 'Battery Capacity', type: 'text', required: false },
          { name: 'Screen Size', type: 'text', required: false }
        ])]
      );
      catId = insert.rows[0].id;
    } else {
      catId = res.rows[0].id;
      console.log(`Updating existing Mobile category (id: ${catId}) with custom fields.`);
      await pool.query(
        "UPDATE categories SET custom_fields = $1 WHERE id = $2",
        [JSON.stringify([
          { name: 'Product Name', type: 'text', required: true },
          { name: 'Product Image URL', type: 'upload', required: true },
          { name: 'Price', type: 'number', required: true },
          { name: 'Stock Quantity', type: 'number', required: true },
          { name: 'Battery Capacity', type: 'text', required: false },
          { name: 'Screen Size', type: 'text', required: false }
        ]), catId]
      );
    }
    console.log('Mobile category successfully updated with custom fields!');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();

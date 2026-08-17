const pool = require('./db');

async function seed() {
  try {
    console.log('Seeding categories and products...');

    // Clean existing
    await pool.query('DELETE FROM products');
    await pool.query('DELETE FROM categories');

    // 1. Insert Categories
    const catResult = await pool.query(`
      INSERT INTO categories (name, models, image_url)
      VALUES 
        ('Party Wear', '["Maxi", "Midi", "Gown"]', 'https://res.cloudinary.com/demo/image/upload/sample.jpg'),
        ('Casual Wear', '["A-Line", "Shift", "Wrap"]', 'https://res.cloudinary.com/demo/image/upload/sample.jpg'),
        ('Ethnic Wear', '["Anarkali", "Kurti", "Lehenga"]', 'https://res.cloudinary.com/demo/image/upload/sample.jpg')
      RETURNING *;
    `);

    console.log('Categories seeded:', catResult.rowCount);

    // 2. Insert Products
    const productsData = [
      {
        name: 'Red Velvet Party Gown',
        description: 'Elegant red velvet gown perfect for evening parties.',
        category: 'Party Wear',
        model: 'Gown',
        sizes: JSON.stringify([{ size: 'S', price: 2500 }, { size: 'M', price: 2500 }, { size: 'L', price: 2500 }]),
        image_url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
      },
      {
        name: 'Floral Casual Midi',
        description: 'Breezy floral midi dress for a perfect summer day.',
        category: 'Casual Wear',
        model: 'Midi',
        sizes: JSON.stringify([{ size: 'S', price: 1200 }, { size: 'M', price: 1200 }]),
        image_url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
      },
      {
        name: 'Silk Anarkali Suit',
        description: 'Traditional silk Anarkali with intricate embroidery.',
        category: 'Ethnic Wear',
        model: 'Anarkali',
        sizes: JSON.stringify([{ size: 'M', price: 3500 }, { size: 'L', price: 3500 }, { size: 'XL', price: 3500 }]),
        image_url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
      }
    ];

    for (let p of productsData) {
      await pool.query(`
        INSERT INTO products (name, description, category, model, sizes, image_url, stock, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, 50, true)
      `, [p.name, p.description, p.category, p.model, p.sizes, p.image_url]);
    }
    
    console.log('Products seeded:', productsData.length);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();

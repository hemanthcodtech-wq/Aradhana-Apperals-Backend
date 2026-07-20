const pool = require('./db');

async function seed() {
  try {
    console.log('Clearing existing categories and products...');
    await pool.query('TRUNCATE TABLE products RESTART IDENTITY CASCADE');
    await pool.query('TRUNCATE TABLE categories RESTART IDENTITY CASCADE');

    const categories = [
      { name: 'Mobiles', image_url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&q=80' },
      { name: 'Electronics', image_url: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=500&q=80' },
      { name: 'Fashion', image_url: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=500&q=80' },
      { name: 'Home & Furniture', image_url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500&q=80' },
      { name: 'Appliances', image_url: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=500&q=80' },
      { name: 'Grocery', image_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80' }
    ];

    console.log('Seeding categories...');
    for (const cat of categories) {
      await pool.query(
        'INSERT INTO categories (name, models, image_url) VALUES ($1, $2, $3)',
        [cat.name, '[]', cat.image_url]
      );
    }

    console.log('Seeding products...');
    const productsData = [
      { name: 'APPLE iPhone 15 (Black, 128 GB)', description: 'Dynamic Island bubbles up alerts and Live Activities. 48MP Main camera with 2x Telephoto. USB-C connector.', price: 72999, category: 'Mobiles', color: 'Black', image_url: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=500&q=80' },
      { name: 'SAMSUNG Galaxy S24 Ultra 5G (Titanium Gray, 256 GB)', description: 'Galaxy AI is here. 200MP camera, 100x Space Zoom, built-in S Pen.', price: 129999, category: 'Mobiles', color: 'Titanium Gray', image_url: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=500&q=80' },
      { name: 'Apple MacBook Air M2', description: 'Supercharged by M2 chip. 13.6-inch Liquid Retina display, 8GB RAM, 256GB SSD.', price: 99990, category: 'Electronics', color: 'Silver', image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&q=80' },
      { name: 'SONY WH-1000XM5 Bluetooth Headset', description: 'Industry leading noise cancellation, 30 hours battery life, multipoint connection.', price: 29990, category: 'Electronics', color: 'Black', image_url: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=500&q=80' },
      { name: 'Men Striped Round Neck Cotton Blend T-Shirt', description: 'Comfortable everyday casual t-shirt for men. 100% premium cotton blend.', price: 499, category: 'Fashion', color: 'Striped', image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80' },
      { name: 'Women Printed Cotton Blend Kurta', description: 'Elegant ethnic wear for women. Perfect for festive occasions and casual wear.', price: 799, category: 'Fashion', color: 'Printed', image_url: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=500&q=80' },
      { name: 'Bharat Lifestyle 5 Seater Fabric Sofa Set', description: 'Premium 3+1+1 brown fabric sofa set. Durable and comfortable.', price: 15999, category: 'Home & Furniture', color: 'Brown', image_url: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=500&q=80' },
      { name: 'SAMSUNG 236 L Frost Free Double Door Refrigerator', description: 'Digital Inverter Compressor, 3 Star Energy Rating, Frost Free.', price: 23490, category: 'Appliances', color: 'Silver', image_url: 'https://images.unsplash.com/photo-1584269600519-112d00e42a1f?w=500&q=80' },
      { name: 'Happilo Premium 100% Natural California Almonds', description: 'Premium quality raw almonds. High in protein and fiber.', price: 649, category: 'Grocery', color: 'Natural', image_url: 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=500&q=80' }
    ];

    for (const p of productsData) {
      const sizesJson = JSON.stringify([
        { size: 'Standard', price: p.price }
      ]);
      const imagesJson = JSON.stringify([p.image_url]);
      
      await pool.query(
        'INSERT INTO products (name, description, sizes, stock, image_url, images, color, category, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [p.name, p.description, sizesJson, 50, p.image_url, imagesJson, p.color, p.category, true]
      );
    }

    console.log('✅ Seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
}

seed();

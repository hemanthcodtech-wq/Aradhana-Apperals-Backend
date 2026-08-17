const pool = require('./db');

async function seed() {
  try {
    console.log('Seeding Swabhivar categories and products...');

    const categories = [
      { name: 'Sarees', models: '["Silk", "Cotton", "Kanjeevaram"]', image: 'https://images.unsplash.com/photo-1610030469983-98e550d615ef?auto=format&fit=crop&q=80&w=400&h=300' },
      { name: 'Kurtis', models: '["Anarkali", "Straight", "A-Line"]', image: 'https://images.unsplash.com/photo-1583391733958-6c5890e090f7?auto=format&fit=crop&q=80&w=400&h=300' },
      { name: 'Lehengas', models: '["Bridal", "Party", "Casual"]', image: 'https://images.unsplash.com/photo-1610419993549-2e1d7464b73b?auto=format&fit=crop&q=80&w=400&h=300' }
    ];

    for (const cat of categories) {
      await pool.query(`
        INSERT INTO categories (name, models, image_url)
        VALUES ($1, $2, $3)
      `, [cat.name, cat.models, cat.image]);
    }

    const products = [
      {
        name: 'Kanjeevaram Silk Saree',
        description: 'Authentic pure silk Kanjeevaram Saree with intricate zari work.',
        category: 'Sarees',
        model: 'Kanjeevaram',
        sizes: JSON.stringify([{ size: 'Free Size', price: 15500 }]),
        image_url: 'https://images.unsplash.com/photo-1610030469983-98e550d615ef?auto=format&fit=crop&q=80&w=800&h=800'
      },
      {
        name: 'Cotton Blend Kurti',
        description: 'Comfortable daily wear cotton blend straight kurti.',
        category: 'Kurtis',
        model: 'Straight',
        sizes: JSON.stringify([{ size: 'M', price: 1299 }, { size: 'L', price: 1299 }]),
        image_url: 'https://images.unsplash.com/photo-1583391733958-6c5890e090f7?auto=format&fit=crop&q=80&w=800&h=800'
      },
      {
        name: 'Bridal Lehenga Choli',
        description: 'Stunning bridal lehenga with heavy embroidery.',
        category: 'Lehengas',
        model: 'Bridal',
        sizes: JSON.stringify([{ size: 'Custom', price: 45000 }]),
        image_url: 'https://images.unsplash.com/photo-1610419993549-2e1d7464b73b?auto=format&fit=crop&q=80&w=800&h=800'
      },
      {
        name: 'Georgette Anarkali Suit',
        description: 'Beautiful georgette anarkali with fine details.',
        category: 'Kurtis',
        model: 'Anarkali',
        sizes: JSON.stringify([{ size: 'L', price: 3499 }, { size: 'XL', price: 3499 }]),
        image_url: 'https://images.unsplash.com/photo-1605763240000-7e93b172d754?auto=format&fit=crop&q=80&w=800&h=800'
      },
      {
        name: 'Banarasi Silk Saree',
        description: 'Premium Banarasi silk saree perfect for weddings.',
        category: 'Sarees',
        model: 'Silk',
        sizes: JSON.stringify([{ size: 'Free Size', price: 21000 }]),
        image_url: 'https://images.unsplash.com/photo-1583391733975-6c5890e090f7?auto=format&fit=crop&q=80&w=800&h=800'
      }
    ];

    for (let p of products) {
      try {
        await pool.query(`
          INSERT INTO products (name, description, category, model, sizes, image_url, stock, is_active, is_bestseller, is_trending)
          VALUES ($1, $2, $3, $4, $5, $6, 50, true, true, true)
        `, [p.name, p.description, p.category, p.model, p.sizes, p.image_url]);
      } catch (err) {
        await pool.query(`
          INSERT INTO products (name, description, category, model, sizes, image_url, stock, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, 50, true)
        `, [p.name, p.description, p.category, p.model, p.sizes, p.image_url]);
      }
    }

    console.log('Swabhivar Products seeded:', products.length);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();

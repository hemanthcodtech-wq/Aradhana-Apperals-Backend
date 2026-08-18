const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_mUxcFWj4qnv7@ep-billowing-dust-ax9fea7q-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require'
});

const sportswearCategories = [
  { name: 'T-Shirts', description: 'Premium activewear t-shirts', image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80' },
  { name: 'Track Pants', description: 'Comfortable and durable track pants', image_url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80' },
  { name: 'Shorts', description: 'Performance training shorts', image_url: 'https://images.unsplash.com/photo-1591557306067-15104aeb53c1?w=800&q=80' }
];

const sportswearProducts = [
  {
    name: 'Pro Active Performance Tee',
    description: 'Lightweight, sweat-wicking t-shirt designed for maximum performance during intense workouts.',
    short_description: 'Moisture-wicking athletic tee',
    stock: 150,
    sizes: JSON.stringify([{ size: 'S', price: 499, stock: 30 }, { size: 'M', price: 499, stock: 50 }, { size: 'L', price: 499, stock: 50 }, { size: 'XL', price: 499, stock: 20 }]),
    color: 'Navy Blue',
    images: JSON.stringify(['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80']),
    image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80',
    category: 'T-Shirts',
    model: 'Men',
    is_active: true,
    is_bestseller: true,
    is_trending: true,
    badge: 'NEW ARRIVAL',
    price: 499,
    mrp: 999,
    sku: 'TS-PRO-NAVY',
    slug: 'pro-active-performance-tee',
    brand: 'Aradhana Apparels',
    subcategory: 'Sportswear'
  },
  {
    name: 'Elite Training Track Pants',
    description: 'Flexible and comfortable track pants with zip pockets and adjustable drawstring.',
    short_description: 'Premium stretch track pants',
    stock: 200,
    sizes: JSON.stringify([{ size: 'M', price: 1299, stock: 100 }, { size: 'L', price: 1299, stock: 100 }]),
    color: 'Charcoal Grey',
    images: JSON.stringify(['https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80']),
    image_url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80',
    category: 'Track Pants',
    model: 'Men',
    is_active: true,
    is_bestseller: false,
    is_trending: true,
    badge: 'HOT SELLER',
    price: 1299,
    mrp: 1999,
    sku: 'TP-ELITE-GREY',
    slug: 'elite-training-track-pants',
    brand: 'Aradhana Apparels',
    subcategory: 'Sportswear'
  },
  {
    name: 'AeroFlex Gym Shorts',
    description: 'Quick-dry gym shorts with built-in compression liner for ultimate support.',
    short_description: '2-in-1 compression shorts',
    stock: 120,
    sizes: JSON.stringify([{ size: 'S', price: 799, stock: 40 }, { size: 'M', price: 799, stock: 40 }, { size: 'L', price: 799, stock: 40 }]),
    color: 'Black',
    images: JSON.stringify(['https://images.unsplash.com/photo-1591557306067-15104aeb53c1?w=800&q=80']),
    image_url: 'https://images.unsplash.com/photo-1591557306067-15104aeb53c1?w=800&q=80',
    category: 'Shorts',
    model: 'Men',
    is_active: true,
    is_bestseller: true,
    is_trending: false,
    badge: 'TRENDING',
    price: 799,
    mrp: 1499,
    sku: 'SH-AERO-BLK',
    slug: 'aeroflex-gym-shorts',
    brand: 'Aradhana Apparels',
    subcategory: 'Sportswear'
  }
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Connected to database. Starting seed...');

    // Ensure categories exist
    for (const cat of sportswearCategories) {
      const res = await client.query('SELECT * FROM public.categories WHERE name = $1', [cat.name]);
      if (res.rows.length === 0) {
        await client.query(
          'INSERT INTO public.categories (name, image_url) VALUES ($1, $2)',
          [cat.name, cat.image_url]
        );
        console.log(`Created category: ${cat.name}`);
      } else {
        console.log(`Category exists: ${cat.name}`);
      }
    }

    // Insert products
    for (const prod of sportswearProducts) {
      const res = await client.query('SELECT * FROM public.products WHERE slug = $1', [prod.slug]);
      if (res.rows.length === 0) {
        const columns = Object.keys(prod).join(', ');
        const values = Object.values(prod);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        
        await client.query(
          `INSERT INTO public.products (${columns}) VALUES (${placeholders})`,
          values
        );
        console.log(`Inserted product: ${prod.name}`);
      } else {
        console.log(`Product exists: ${prod.name}`);
      }
    }

    console.log('Seeding completed successfully!');
  } catch (err) {
    console.error('Error during seeding:', err);
  } finally {
    client.release();
    pool.end();
  }
}

seed();

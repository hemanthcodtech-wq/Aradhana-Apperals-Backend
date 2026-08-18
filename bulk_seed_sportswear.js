const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_mUxcFWj4qnv7@ep-billowing-dust-ax9fea7q-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require'
});

const categories = ['T-Shirts', 'Track Pants', 'Shorts'];

const images = {
  'T-Shirts': [
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80',
    'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=800&q=80',
    'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800&q=80',
    'https://images.unsplash.com/photo-1503341455253-b2e723bb3db8?w=800&q=80',
    'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&q=80',
    'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&q=80',
    'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=800&q=80',
    'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&q=80'
  ],
  'Track Pants': [
    'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80',
    'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=800&q=80',
    'https://images.unsplash.com/photo-1620799140188-3b2a02fd9a77?w=800&q=80',
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80',
    'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80'
  ],
  'Shorts': [
    'https://images.unsplash.com/photo-1591557306067-15104aeb53c1?w=800&q=80',
    'https://images.unsplash.com/photo-1560243563-062bfc001d68?w=800&q=80',
    'https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?w=800&q=80',
    'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=800&q=80',
    'https://images.unsplash.com/photo-1608248593842-8d7d8dc1548e?w=800&q=80'
  ]
};

const adjectives = ['Pro', 'Elite', 'Ultra', 'Core', 'Essential', 'Aero', 'Flex', 'Hyper', 'Stealth', 'Prime', 'Apex', 'Velocity', 'Quantum'];
const materials = ['Dry-Fit', 'Compression', 'Performance', 'Cotton', 'Mesh', 'Woven', 'Tech', 'Stretch'];
const colors = ['Black', 'Navy', 'Grey', 'White', 'Red', 'Blue', 'Olive', 'Maroon', 'Teal', 'Charcoal', 'Neon Green'];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateProducts(count) {
  const products = [];
  for (let i = 1; i <= count; i++) {
    const category = getRandomItem(categories);
    const adjective = getRandomItem(adjectives);
    const material = getRandomItem(materials);
    const color = getRandomItem(colors);
    const img = getRandomItem(images[category]);
    
    let baseName = '';
    if (category === 'T-Shirts') baseName = 'Tee';
    if (category === 'Track Pants') baseName = 'Joggers';
    if (category === 'Shorts') baseName = 'Shorts';

    const name = `${adjective} ${material} ${baseName} - ${color}`;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + i;
    const price = Math.floor(Math.random() * (1500 - 400 + 1)) + 400;
    const mrp = price + Math.floor(Math.random() * 1000) + 200;
    
    const is_trending = Math.random() > 0.7;
    const is_bestseller = Math.random() > 0.8;
    const badge = is_bestseller ? 'BESTSELLER' : (is_trending ? 'TRENDING' : (Math.random() > 0.8 ? 'NEW' : null));

    products.push({
      name,
      description: `High quality ${material.toLowerCase()} ${category.toLowerCase()} perfect for your active lifestyle. Features advanced moisture-wicking and maximum comfort.`,
      short_description: `Premium ${material.toLowerCase()} activewear`,
      stock: Math.floor(Math.random() * 300) + 50,
      sizes: JSON.stringify([
        { size: 'S', price: price, stock: 50 },
        { size: 'M', price: price, stock: 100 },
        { size: 'L', price: price, stock: 100 },
        { size: 'XL', price: price, stock: 50 }
      ]),
      color: color,
      images: JSON.stringify([img]),
      image_url: img,
      category: category,
      model: 'Men',
      is_active: true,
      is_bestseller,
      is_trending,
      badge,
      price,
      mrp,
      sku: `SP-${category.substring(0,2).toUpperCase()}-${i.toString().padStart(4, '0')}`,
      slug,
      brand: 'Aradhana Apparels',
      subcategory: 'Sportswear'
    });
  }
  return products;
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('SET search_path TO public, neon_auth');
    console.log('Connected to database. Generating 110 products...');
    
    const products = generateProducts(110);
    
    let inserted = 0;
    for (const prod of products) {
      const columns = Object.keys(prod).join(', ');
      const values = Object.values(prod);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      
      await client.query(
        `INSERT INTO products (${columns}) VALUES (${placeholders})`,
        values
      );
      inserted++;
    }
    
    console.log(`Successfully inserted ${inserted} products!`);
  } catch (err) {
    console.error('Error during seeding:', err);
  } finally {
    client.release();
    pool.end();
  }
}

seed();

const pool = require('./db');

const categoriesData = [
  { name: 'Sarees', models: '["Silk", "Cotton", "Kanjeevaram", "Banarasi"]' },
  { name: 'Kurtis', models: '["Anarkali", "Straight", "A-Line", "Flared"]' },
  { name: 'Lehengas', models: '["Bridal", "Party", "Casual", "Printed"]' },
  { name: 'Salwar Suits', models: '["Patiala", "Churidar", "Palazzo Suit"]' },
  { name: 'Gowns', models: '["Evening", "Party", "Indo-Western"]' },
  { name: 'Dresses', models: '["Maxi", "Midi", "Ethnic Dress"]' },
  { name: 'Dupattas', models: '["Silk", "Chiffon", "Net", "Cotton"]' },
  { name: 'Ethnic Sets', models: '["Kurta Palazzo", "Kurta Pant"]' },
  { name: 'Tunics', models: '["Short", "Long", "Embroidered"]' },
  { name: 'Jewelry', models: '["Necklace", "Earrings", "Bangles"]' }
];

const categoryImages = {
  'Sarees': [
    'https://images.unsplash.com/photo-1610030469983-98e550d615ef?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1583391733975-6c5890e090f7?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1615886754020-f56f10825bb6?auto=format&fit=crop&q=80&w=800'
  ],
  'Kurtis': [
    'https://images.unsplash.com/photo-1583391733958-6c5890e090f7?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1605763240000-7e93b172d754?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1551806235-a05c31671fc3?auto=format&fit=crop&q=80&w=800'
  ],
  'Lehengas': [
    'https://images.unsplash.com/photo-1610419993549-2e1d7464b73b?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=800'
  ],
  'Salwar Suits': [
    'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1605763240000-7e93b172d754?auto=format&fit=crop&q=80&w=800'
  ],
  'Gowns': [
    'https://images.unsplash.com/photo-1566160980053-93d39580b396?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1596450514735-111a2fe02935?auto=format&fit=crop&q=80&w=800'
  ],
  'Dresses': [
    'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1550639525-c97d455acf70?auto=format&fit=crop&q=80&w=800'
  ],
  'Dupattas': [
    'https://images.unsplash.com/photo-1610030469983-98e550d615ef?auto=format&fit=crop&q=80&w=800'
  ],
  'Ethnic Sets': [
    'https://images.unsplash.com/photo-1583391733958-6c5890e090f7?auto=format&fit=crop&q=80&w=800'
  ],
  'Tunics': [
    'https://images.unsplash.com/photo-1551806235-a05c31671fc3?auto=format&fit=crop&q=80&w=800'
  ],
  'Jewelry': [
    'https://images.unsplash.com/photo-1599643478524-fb66f70a0066?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=800'
  ]
};

const adjectives = ["Premium", "Elegant", "Classic", "Designer", "Handwoven", "Embroidered", "Printed", "Festive", "Royal", "Traditional"];
const materials = ["Silk", "Cotton", "Georgette", "Chiffon", "Velvet", "Crepe", "Linen", "Net"];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
  try {
    console.log('Seeding 10 categories and 100 products...');

    // Try to delete previous data to prevent overwhelming duplicates
    try {
      await pool.query('DELETE FROM products');
      await pool.query('DELETE FROM categories');
    } catch(e) {
      // Ignore if it fails due to constraints
    }

    for (const cat of categoriesData) {
      const img = getRandomItem(categoryImages[cat.name] || categoryImages['Sarees']);
      try {
        await pool.query(`
          INSERT INTO categories (name, models, image_url)
          VALUES ($1, $2, $3)
        `, [cat.name, cat.models, img]);
      } catch(e) {
        // Ignore duplicate key error for categories
      }
    }

    let count = 0;
    for (let i = 0; i < 100; i++) {
      const category = getRandomItem(categoriesData);
      const models = JSON.parse(category.models);
      const model = getRandomItem(models);
      const adjective = getRandomItem(adjectives);
      const material = getRandomItem(materials);
      
      const name = `${adjective} ${material} ${model} ${category.name.replace(/s$/, '')}`;
      const description = `Beautiful and elegant ${name.toLowerCase()} suitable for all occasions. High quality material and perfect finish.`;
      const price = Math.floor(Math.random() * 15000) + 1000;
      const sizes = JSON.stringify([{ size: 'Free Size', price: price }]);
      const image = getRandomItem(categoryImages[category.name] || categoryImages['Sarees']);
      
      const is_trending = Math.random() > 0.5;
      const is_bestseller = Math.random() > 0.8;

      try {
        await pool.query(`
          INSERT INTO products (name, description, category, model, sizes, image_url, stock, is_active, is_bestseller, is_trending)
          VALUES ($1, $2, $3, $4, $5, $6, 100, true, $7, $8)
        `, [name, description, category.name, model, sizes, image, is_bestseller, is_trending]);
      } catch (err) {
        await pool.query(`
          INSERT INTO products (name, description, category, model, sizes, image_url, stock, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, 100, true)
        `, [name, description, category.name, model, sizes, image]);
      }
      count++;
    }

    console.log(`Successfully seeded ${categoriesData.length} categories and ${count} products.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();

const fs = require('fs');
const path = '/Users/hemanthkancharla/nightbe/routes/admin.js';
let content = fs.readFileSync(path, 'utf8');

const newPostRoute = `router.post('/products', authMiddleware, adminOnly, async (req, res) => {
  const { 
    name, description, product_code, category, model, is_active, 
    is_bestseller, is_trending, is_offer, is_festive, allow_reviews, 
    variants, details, reviews, image_url, images, slug, short_description, vendor_id 
  } = req.body;
  
  try {
    let price = 0;
    let stock = 0;
    if (variants && variants.length > 0) {
      if (variants[0].sizes && variants[0].sizes.length > 0) {
        price = variants[0].sizes[0].our_price || variants[0].sizes[0].mrp || 0;
        stock = variants.reduce((acc, v) => acc + (v.sizes || []).reduce((sAcc, s) => sAcc + (Number(s.stock) || 0), 0), 0);
      }
    }

    const result = await pool.query(
      \`INSERT INTO products 
       (name, description, product_code, category, model, is_active, is_bestseller, is_trending, is_offer, is_festive, allow_reviews, variants, details, reviews, image_url, images, slug, short_description, price, stock, vendor_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21) RETURNING *\`,
      [
        name, description, product_code, category, model, 
        is_active ?? true, is_bestseller ?? false, is_trending ?? false, is_offer ?? false, is_festive ?? false, allow_reviews ?? true,
        JSON.stringify(variants || []), JSON.stringify(details || []), JSON.stringify(reviews || []), 
        image_url, JSON.stringify(images || []), slug, short_description, price, stock, vendor_id || null
      ]
    );
    res.json({ product: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});`;

const newPutRoute = `router.put('/products/:id', authMiddleware, adminOnly, async (req, res) => {
  const { 
    name, description, product_code, category, model, is_active, 
    is_bestseller, is_trending, is_offer, is_festive, allow_reviews, 
    variants, details, reviews, image_url, images, slug, short_description, vendor_id 
  } = req.body;
  try {
    let price = 0;
    let stock = 0;
    if (variants && variants.length > 0) {
      if (variants[0].sizes && variants[0].sizes.length > 0) {
        price = variants[0].sizes[0].our_price || variants[0].sizes[0].mrp || 0;
        stock = variants.reduce((acc, v) => acc + (v.sizes || []).reduce((sAcc, s) => sAcc + (Number(s.stock) || 0), 0), 0);
      }
    }

    const result = await pool.query(
      \`UPDATE products SET 
        name=$1, description=$2, product_code=$3, category=$4, model=$5, 
        is_active=$6, is_bestseller=$7, is_trending=$8, is_offer=$9, is_festive=$10, allow_reviews=$11, 
        variants=$12, details=$13, reviews=$14, image_url=$15, images=$16, slug=$17, short_description=$18, price=$19, stock=$20, vendor_id=$21
       WHERE id=$22 RETURNING *\`,
      [
        name, description, product_code, category, model, 
        is_active ?? true, is_bestseller ?? false, is_trending ?? false, is_offer ?? false, is_festive ?? false, allow_reviews ?? true,
        JSON.stringify(variants || []), JSON.stringify(details || []), JSON.stringify(reviews || []), 
        image_url, JSON.stringify(images || []), slug, short_description, price, stock, vendor_id || null, req.params.id
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ product: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});`;

// Replace POST
content = content.replace(/router\.post\('\/products'[\s\S]*?(?=router\.put\('\/products\/:id')/, newPostRoute + '\n\n');
// Replace PUT
content = content.replace(/router\.put\('\/products\/:id'[\s\S]*?(?=router\.delete\('\/products\/:id')/, newPutRoute + '\n\n');

fs.writeFileSync(path, content);
console.log("Routes updated successfully");

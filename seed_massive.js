const pool = require('./db');

// Realistic matching data for generation
const data = {
  "Mobiles": {
    img: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&q=80",
    items: [
      ["APPLE", "iPhone 15 Pro Max", 159900], ["APPLE", "iPhone 14 Plus", 79900], ["APPLE", "iPhone 13", 59900],
      ["SAMSUNG", "Galaxy S24 Ultra", 129999], ["SAMSUNG", "Galaxy S23 FE", 54999], ["SAMSUNG", "Galaxy Z Fold5", 154999],
      ["Google", "Pixel 8 Pro", 106999], ["Google", "Pixel 7a", 43999], ["OnePlus", "12R 5G", 39999],
      ["OnePlus", "Nord CE 3", 24999], ["Xiaomi", "14 Ultra", 99999], ["Redmi", "Note 13 Pro+", 31999],
      ["Vivo", "X100 Pro", 89999], ["Oppo", "Reno 11 Pro", 39999], ["Nothing", "Phone (2a)", 23999]
    ],
    desc: "Premium flagship smartphone with advanced camera system, stunning OLED display, and all-day battery life.",
    images: [
      "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=500&q=80",
      "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500&q=80",
      "https://images.unsplash.com/photo-1598327105666-5b89351cb31b?w=500&q=80",
      "https://images.unsplash.com/photo-1533228100845-08145b01de14?w=500&q=80"
    ]
  },
  "Laptops": {
    img: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=500&q=80",
    items: [
      ["Apple", "MacBook Pro M3", 169900], ["Apple", "MacBook Air M2", 99900], ["Dell", "XPS 15", 189900],
      ["Dell", "Inspiron 14", 54900], ["HP", "Spectre x360", 139900], ["HP", "Pavilion Gaming", 74900],
      ["Lenovo", "ThinkPad X1 Carbon", 159900], ["Lenovo", "IdeaPad Slim 5", 62900], ["Lenovo", "Legion Pro 5", 145900],
      ["ASUS", "ROG Zephyrus G14", 164900], ["ASUS", "Vivobook 15", 42900], ["ASUS", "TUF Gaming A15", 79900],
      ["Acer", "Predator Helios", 129900], ["Acer", "Swift 3", 59900], ["MSI", "Katana 15", 89900]
    ],
    desc: "High-performance laptop featuring a brilliant display, ultra-fast SSD storage, and all-day battery perfect for work and gaming.",
    images: [
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&q=80",
      "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500&q=80",
      "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=500&q=80",
      "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=500&q=80"
    ]
  },
  "Audio": {
    img: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=500&q=80",
    items: [
      ["Sony", "WH-1000XM5", 29990], ["Sony", "WF-1000XM5 Earbuds", 24990], ["Apple", "AirPods Pro (2nd Gen)", 24900],
      ["Apple", "AirPods Max", 59900], ["Bose", "QuietComfort Ultra", 35900], ["Bose", "SoundLink Flex", 15900],
      ["Sennheiser", "Momentum 4", 34990], ["JBL", "Flip 6 Speaker", 11999], ["JBL", "Tour One M2", 24999],
      ["Samsung", "Galaxy Buds2 Pro", 16999], ["OnePlus", "Buds Pro 2", 11999], ["Nothing", "Ear (2)", 9999],
      ["Marshall", "Major IV", 14999], ["Marshall", "Emberton II", 17999], ["Boat", "Airdopes 441", 1999]
    ],
    desc: "Immersive high-fidelity audio with active noise cancellation and ergonomic design for all-day listening comfort.",
    images: [
      "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=500&q=80",
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80",
      "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500&q=80",
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&q=80"
    ]
  },
  "Men's Fashion": {
    img: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=500&q=80",
    items: [
      ["Nike", "Sportswear Tech Fleece", 4995], ["Nike", "Air Force 1 Sneakers", 8495], ["Adidas", "Originals Trefoil Tee", 1999],
      ["Adidas", "Ultraboost 1.0", 15999], ["Puma", "Motorsport Jacket", 5999], ["Levi's", "501 Original Fit Jeans", 3499],
      ["Levi's", "Denim Trucker Jacket", 4599], ["Tommy Hilfiger", "Polo Shirt", 3999], ["Calvin Klein", "Slim Fit Chinos", 4999],
      ["US Polo Assn", "Checked Casual Shirt", 2199], ["Zara", "Textured Knit Sweater", 3990], ["H&M", "Regular Fit Hoodie", 1499],
      ["Jack & Jones", "Leather Biker Jacket", 8999], ["Woodland", "Leather Trekking Shoes", 4599], ["Fastrack", "Chronograph Watch", 3495]
    ],
    desc: "Premium quality men's apparel crafted for comfort, durability, and a sharp modern aesthetic.",
    images: [
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80",
      "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=500&q=80",
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500&q=80",
      "https://images.unsplash.com/photo-1507680434267-325d7620e405?w=500&q=80"
    ]
  },
  "Women's Fashion": {
    img: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=500&q=80",
    items: [
      ["Biba", "Anarkali Kurta Set", 3999], ["W for Woman", "Straight Printed Kurta", 1499], ["Aurelia", "Festive Wear Lehenga", 5999],
      ["Zara", "Pleated Midi Skirt", 2990], ["Zara", "Oversized Blazer", 4990], ["H&M", "Floral Summer Dress", 1999],
      ["Mango", "High-Waist Trousers", 3590], ["Levi's", "711 Skinny Jeans", 3299], ["Nike", "Air Max 270 Women", 11995],
      ["Adidas", "Stan Smith Sneakers", 7999], ["Aldo", "Quilted Crossbody Bag", 5999], ["Caprese", "Faux Leather Tote", 3499],
      ["Daniel Wellington", "Rose Gold Watch", 12999], ["Swarovski", "Crystal Pendant Necklace", 8990], ["MAC", "Ruby Woo Lipstick", 1950]
    ],
    desc: "Elegant and trendy women's fashion featuring premium fabrics, exquisite detailing, and comfortable fits.",
    images: [
      "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=500&q=80",
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&q=80",
      "https://images.unsplash.com/photo-1583391733959-53e34b8c9d1c?w=500&q=80",
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=500&q=80"
    ]
  },
  "Home & Furniture": {
    img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500&q=80",
    items: [
      ["Wakefit", "Orthopedic Memory Foam Mattress", 12499], ["Wakefit", "Engineered Wood Bed", 15999], ["IKEA", "KIVIK 3-Seat Sofa", 35990],
      ["IKEA", "BILLY Bookcase", 4990], ["Urban Ladder", "Solid Wood Dining Set", 34999], ["Urban Ladder", "L-Shaped Sectional Sofa", 45999],
      ["Pepperfry", "Sheesham Wood Coffee Table", 8999], ["Pepperfry", "Ergonomic Office Chair", 5999], ["Bombay Dyeing", "Cotton Double Bedsheet", 1499],
      ["Spaces", "Premium Bath Towel Set", 1999], ["Philips", "Smart Wi-Fi LED Bulb", 799], ["Dyson", "V11 Absolute Vacuum", 49900],
      ["Solimo", "Non-Stick Cookware Set", 2499], ["Prestige", "Induction Base Pressure Cooker", 1899], ["Borosil", "Glass Casserole Set", 1299]
    ],
    desc: "Transform your living space with our premium home furnishings. Crafted for longevity and modern aesthetics.",
    images: [
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=500&q=80",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=500&q=80",
      "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=500&q=80",
      "https://images.unsplash.com/photo-1550226891-ef816aed4a98?w=500&q=80"
    ]
  },
  "Appliances": {
    img: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=500&q=80",
    items: [
      ["Samsung", "236 L Double Door Refrigerator", 24990], ["LG", "8 kg Front Load Washing Machine", 34990], ["Whirlpool", "1.5 Ton 5 Star Split AC", 39990],
      ["Daikin", "1.5 Ton 3 Star Inverter AC", 36990], ["Voltas", "Beko Microwave Oven", 7990], ["IFB", "Dishwasher 12 Place Settings", 42990],
      ["Bosch", "7 kg Fully Automatic Washer", 29990], ["Haier", "190 L Single Door Refrigerator", 14990], ["Sony", "Bravia 55 inch 4K Smart TV", 64990],
      ["Samsung", "The Frame 65 inch QLED TV", 129990], ["LG", "43 inch Full HD Smart TV", 27990], ["Philips", "Air Fryer HD9200", 6999],
      ["Eureka Forbes", "Aquaguard Water Purifier", 15999], ["Kent", "Grand+ RO Water Purifier", 17999], ["Bajaj", "New Shakti Storage Water Heater", 6499]
    ],
    desc: "Energy-efficient smart appliances designed to make your daily chores effortless and upgrade your lifestyle.",
    images: [
      "https://images.unsplash.com/photo-1584269600519-112d00e42a1f?w=500&q=80",
      "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=500&q=80",
      "https://images.unsplash.com/photo-1626806787426-5910811b6325?w=500&q=80",
      "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=500&q=80"
    ]
  },
  "Beauty & Grooming": {
    img: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&q=80",
    items: [
      ["L'Oreal", "Revitalift Hyaluronic Acid Serum", 999], ["Olay", "Regenerist Micro-Sculpting Cream", 1699], ["Neutrogena", "Hydro Boost Water Gel", 1050],
      ["Clinique", "Moisture Surge 100H", 3200], ["Estee Lauder", "Advanced Night Repair", 6500], ["MAC", "Studio Fix Fluid Foundation", 3300],
      ["Maybelline", "Fit Me Matte + Poreless", 599], ["Huda Beauty", "Desert Dusk Eyeshadow Palette", 5300], ["Dior", "Sauvage Eau de Parfum", 10500],
      ["Chanel", "Bleu de Chanel", 11200], ["Philips", "Norelco Multigroom 7000", 4599], ["Braun", "Silk-epil 9 Epilator", 6999],
      ["Dyson", "Airwrap Hair Styler", 45900], ["Forest Essentials", "Soundarya Radiance Cream", 5400], ["Kama Ayurveda", "Kumkumadi Miraculous Fluid", 2995]
    ],
    desc: "Premium skincare and grooming essentials to enhance your natural beauty and daily self-care routine.",
    images: [
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&q=80",
      "https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=500&q=80",
      "https://images.unsplash.com/photo-1617897903246-719242758050?w=500&q=80",
      "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=500&q=80"
    ]
  },
  "Sports & Fitness": {
    img: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=500&q=80",
    items: [
      ["Nike", "Pro Training T-Shirt", 2495], ["Under Armour", "Project Rock Duffle Bag", 5999], ["Decathlon", "Domyos 20kg Dumbbell Set", 3999],
      ["CultSport", "Smart Spin Bike", 18999], ["Garmin", "Forerunner 265", 42990], ["Fitbit", "Charge 6 Fitness Tracker", 14999],
      ["Yonex", "Voltric Z Force II Racket", 9999], ["Nivia", "Storm Football Size 5", 899], ["Spalding", "NBA Gold Basketball", 2499],
      ["Kookaburra", "Kashmir Willow Cricket Bat", 3499], ["Vector X", "Yoga Mat 8mm", 899], ["Optimum Nutrition", "Gold Standard Whey 2kg", 6999],
      ["MuscleBlaze", "Biozyme Performance Whey", 2499], ["Decathlon", "Riverside 500 Hybrid Bike", 17999], ["Speedo", "Fastskin Swimming Goggles", 2999]
    ],
    desc: "High-performance sports and fitness equipment to help you crush your goals and stay active.",
    images: [
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=500&q=80",
      "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=500&q=80",
      "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=500&q=80",
      "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=500&q=80"
    ]
  },
  "Grocery": {
    img: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80",
    items: [
      ["Happilo", "Premium Californian Almonds", 649], ["Tata Sampann", "Unpolished Toor Dal", 199], ["Aashirvaad", "Select Premium Sharbati Atta", 349],
      ["Saffola", "Gold Blended Cooking Oil 5L", 899], ["Fortune", "Basmati Rice 5kg", 699], ["Maggi", "2-Minute Noodles 12 Pack", 168],
      ["Nescafe", "Classic Instant Coffee 200g", 615], ["Taj Mahal", "Premium Tea 500g", 345], ["Kellogg's", "Corn Flakes Original 875g", 320],
      ["Oreo", "Chocolate Sandwich Biscuits", 80], ["Cadbury", "Dairy Milk Silk Roast Almond", 175], ["Ferrero Rocher", "Premium Chocolates 24 Pieces", 899],
      ["Real", "Mixed Fruit Juice 1L", 110], ["Red Bull", "Energy Drink 4 Pack", 460], ["Pampers", "Active Baby Taped Diapers", 1299]
    ],
    desc: "Daily essentials and premium groceries delivered fresh. Quality assured for your family's health.",
    images: [
      "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=500&q=80",
      "https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=500&q=80",
      "https://images.unsplash.com/photo-1587049352847-81a56d773c1c?w=500&q=80",
      "https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=500&q=80"
    ]
  }
};

async function seed() {
  try {
    console.log('Clearing existing categories and products...');
    await pool.query('TRUNCATE TABLE products RESTART IDENTITY CASCADE');
    await pool.query('TRUNCATE TABLE categories RESTART IDENTITY CASCADE');

    const catNames = Object.keys(data);
    console.log('Seeding categories...');
    for (const name of catNames) {
      await pool.query(
        'INSERT INTO categories (name, models, image_url) VALUES ($1, $2, $3)',
        [name, '[]', data[name].img]
      );
    }

    console.log('Seeding 150 products...');
    for (const cat of catNames) {
      const items = data[cat].items;
      for (let i = 0; i < items.length; i++) {
        const brand = items[i][0];
        const prodName = items[i][1];
        const price = items[i][2];
        const fullName = `${brand} ${prodName}`;
        
        const sizesJson = JSON.stringify([{ size: 'Standard', price: price }]);
        const imgUrl = data[cat].images[i % data[cat].images.length];
        const imagesJson = JSON.stringify([imgUrl]);
        
        await pool.query(
          'INSERT INTO products (name, description, sizes, stock, image_url, images, color, category, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
          [fullName, data[cat].desc, sizesJson, 50, imgUrl, imagesJson, 'Standard', cat, true]
        );
      }
    }

    console.log('✅ Seeding complete! Inserted 10 categories and 150 products.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
}

seed();

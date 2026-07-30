const pool = require('./db');
const bcrypt = require('bcryptjs');

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS support_agents (
        id        SERIAL PRIMARY KEY,
        name      VARCHAR(255) NOT NULL,
        email     VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✅ support_agents table created');

    // Seed a default support agent (change credentials as needed)
    const email = 'support@indbasket.com';
    const existing = await pool.query('SELECT id FROM support_agents WHERE email = $1', [email]);
    if (existing.rows.length === 0) {
      const hash = await bcrypt.hash('support123', 10);
      await pool.query(
        'INSERT INTO support_agents (name, email, password_hash) VALUES ($1, $2, $3)',
        ['Support Agent', email, hash]
      );
      console.log('✅ Default support agent created — email: support@indbasket.com | password: support123');
    } else {
      console.log('ℹ️  Default support agent already exists');
    }
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    process.exit();
  }
}

migrate();

const router = require('express').Router();
const pool = require('../db');
const { authMiddleware } = require('./auth');

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// GET all advertisements
router.get('/', async (req, res) => {
  try {
    const { type, is_active } = req.query;
    let query = 'SELECT * FROM advertisements WHERE 1=1';
    let params = [];
    
    if (type) {
      params.push(type);
      query += ` AND type = $${params.length}`;
    }
    if (is_active !== undefined) {
      params.push(is_active === 'true');
      query += ` AND is_active = $${params.length}`;
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    res.json({ advertisements: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new advertisement
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  const { type, title, image_url, video_url, link_url, target_id, is_active, valid_from, valid_until } = req.body;
  if (!type) return res.status(400).json({ error: 'Type is required' });

  try {
    const result = await pool.query(
      `INSERT INTO advertisements (type, title, image_url, video_url, link_url, target_id, is_active, valid_from, valid_until) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [type, title, image_url, video_url, link_url, target_id, is_active, valid_from || null, valid_until || null]
    );
    res.status(201).json({ advertisement: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update advertisement
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { type, title, image_url, video_url, link_url, target_id, is_active, valid_from, valid_until } = req.body;

  try {
    const result = await pool.query(
      `UPDATE advertisements 
       SET type=$1, title=$2, image_url=$3, video_url=$4, link_url=$5, target_id=$6, is_active=$7, valid_from=$8, valid_until=$9 
       WHERE id=$10 RETURNING *`,
      [type, title, image_url, video_url, link_url, target_id, is_active, valid_from || null, valid_until || null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Advertisement not found' });
    res.json({ advertisement: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE advertisement
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM advertisements WHERE id=$1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Advertisement not found' });
    res.json({ message: 'Advertisement deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

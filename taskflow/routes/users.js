const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDB } = require('../db/database');
const { authenticate, requireSystemAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/users — list all users (admin) or search
router.get('/', (req, res) => {
  const db = getDB();
  const { search } = req.query;

  let users;
  if (search) {
    users = db.prepare(`
      SELECT id, name, email, system_role, avatar_color, created_at
      FROM users WHERE name LIKE ? OR email LIKE ?
      ORDER BY name LIMIT 20
    `).all(`%${search}%`, `%${search}%`);
  } else if (req.user.system_role === 'admin') {
    users = db.prepare(`
      SELECT u.id, u.name, u.email, u.system_role, u.avatar_color, u.created_at,
        (SELECT COUNT(*) FROM project_members WHERE user_id = u.id) as project_count
      FROM users u ORDER BY u.created_at DESC
    `).all();
  } else {
    return res.status(403).json({ error: 'Admin access required' });
  }

  res.json({ users });
});

// PATCH /api/users/:id/role — change system role (admin only)
router.patch('/:id/role', requireSystemAdmin, [
  body('system_role').isIn(['admin', 'user']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  if (req.params.id == req.user.id) {
    return res.status(400).json({ error: 'Cannot change your own role' });
  }

  const db = getDB();
  db.prepare('UPDATE users SET system_role = ? WHERE id = ?').run(req.body.system_role, req.params.id);
  const user = db.prepare('SELECT id, name, email, system_role, avatar_color FROM users WHERE id = ?').get(req.params.id);
  res.json({ user });
});

// DELETE /api/users/:id (admin only)
router.delete('/:id', requireSystemAdmin, (req, res) => {
  if (req.params.id == req.user.id) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }
  const db = getDB();
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ message: 'User deleted' });
});

module.exports = router;

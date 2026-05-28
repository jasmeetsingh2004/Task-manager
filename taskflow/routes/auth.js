const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { getDB } = require('../db/database');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f97316','#10b981','#06b6d4','#f59e0b','#ef4444'];

// POST /api/auth/register
router.post('/register', [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, password } = req.body;
  const db = getDB();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const password_hash = bcrypt.hashSync(password, 12);
  const avatar_color = COLORS[Math.floor(Math.random() * COLORS.length)];

  // First user becomes system admin
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get();
  const system_role = count.c === 0 ? 'admin' : 'user';

  const result = db.prepare(
    'INSERT INTO users (name, email, password_hash, system_role, avatar_color) VALUES (?, ?, ?, ?, ?)'
  ).run(name, email, password_hash, system_role, avatar_color);

  const token = jwt.sign({ userId: result.lastInsertRowid }, JWT_SECRET, { expiresIn: '7d' });
  const user = db.prepare('SELECT id, name, email, system_role, avatar_color FROM users WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({ token, user });
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  const db = getDB();

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
  const { password_hash, ...safeUser } = user;

  res.json({ token, user: safeUser });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// PATCH /api/auth/profile
router.patch('/profile', authenticate, [
  body('name').optional().trim().isLength({ min: 2, max: 50 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name } = req.body;
  const db = getDB();

  if (name) {
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, req.user.id);
  }

  const user = db.prepare('SELECT id, name, email, system_role, avatar_color FROM users WHERE id = ?').get(req.user.id);
  res.json({ user });
});

module.exports = router;

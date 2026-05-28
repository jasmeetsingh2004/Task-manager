const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDB } = require('../db/database');
const { authenticate, requireProjectRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/projects — list projects user is a member of
router.get('/', (req, res) => {
  const db = getDB();
  let projects;

  if (req.user.system_role === 'admin') {
    projects = db.prepare(`
      SELECT p.*, u.name as owner_name,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      ORDER BY p.created_at DESC
    `).all();
  } else {
    projects = db.prepare(`
      SELECT p.*, u.name as owner_name, pm.role as my_role,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
      ORDER BY p.created_at DESC
    `).all(req.user.id);
  }

  res.json({ projects });
});

// POST /api/projects — create project
router.post('/', [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description = '', color = '#6366f1' } = req.body;
  const db = getDB();

  const result = db.prepare(
    'INSERT INTO projects (name, description, color, owner_id) VALUES (?, ?, ?, ?)'
  ).run(name, description, color, req.user.id);

  // Add creator as project admin
  db.prepare(
    'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)'
  ).run(result.lastInsertRowid, req.user.id, 'admin');

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ project });
});

// GET /api/projects/:id
router.get('/:id', requireProjectRole(), (req, res) => {
  const db = getDB();
  const project = db.prepare(`
    SELECT p.*, u.name as owner_name
    FROM projects p JOIN users u ON p.owner_id = u.id
    WHERE p.id = ?
  `).get(req.params.id);

  if (!project) return res.status(404).json({ error: 'Project not found' });

  const members = db.prepare(`
    SELECT u.id, u.name, u.email, u.avatar_color, pm.role, pm.joined_at
    FROM project_members pm JOIN users u ON pm.user_id = u.id
    WHERE pm.project_id = ?
    ORDER BY pm.role DESC, u.name
  `).all(req.params.id);

  const tasks = db.prepare(`
    SELECT t.*, 
      u1.name as assignee_name, u1.avatar_color as assignee_color,
      u2.name as creator_name
    FROM tasks t
    LEFT JOIN users u1 ON t.assignee_id = u1.id
    LEFT JOIN users u2 ON t.creator_id = u2.id
    WHERE t.project_id = ?
    ORDER BY t.created_at DESC
  `).all(req.params.id);

  const myRole = req.projectRole || (req.user.system_role === 'admin' ? 'admin' : 'member');

  res.json({ project, members, tasks, myRole });
});

// PATCH /api/projects/:id
router.patch('/:id', requireProjectRole(['admin']), [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDB();
  const { name, description, color } = req.body;
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  db.prepare(`
    UPDATE projects SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      color = COALESCE(?, color)
    WHERE id = ?
  `).run(name || null, description || null, color || null, req.params.id);

  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json({ project: updated });
});

// DELETE /api/projects/:id
router.delete('/:id', requireProjectRole(['admin']), (req, res) => {
  const db = getDB();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  // Only owner or system admin can delete
  if (project.owner_id !== req.user.id && req.user.system_role !== 'admin') {
    return res.status(403).json({ error: 'Only project owner can delete' });
  }

  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ message: 'Project deleted' });
});

// POST /api/projects/:id/members — add member by email
router.post('/:id/members', requireProjectRole(['admin']), [
  body('email').isEmail().normalizeEmail(),
  body('role').optional().isIn(['admin', 'member']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, role = 'member' } = req.body;
  const db = getDB();

  const user = db.prepare('SELECT id, name, email, avatar_color FROM users WHERE email = ?').get(email);
  if (!user) return res.status(404).json({ error: 'No user found with that email' });

  const existing = db.prepare(
    'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?'
  ).get(req.params.id, user.id);
  if (existing) return res.status(409).json({ error: 'User is already a member' });

  db.prepare(
    'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)'
  ).run(req.params.id, user.id, role);

  res.status(201).json({ member: { ...user, role } });
});

// PATCH /api/projects/:id/members/:userId — update member role
router.patch('/:id/members/:userId', requireProjectRole(['admin']), [
  body('role').isIn(['admin', 'member']),
], (req, res) => {
  const db = getDB();
  const { role } = req.body;
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);

  // Can't downgrade owner
  if (project.owner_id == req.params.userId && role !== 'admin') {
    return res.status(400).json({ error: 'Cannot change owner role' });
  }

  db.prepare(
    'UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?'
  ).run(role, req.params.id, req.params.userId);

  res.json({ message: 'Role updated' });
});

// DELETE /api/projects/:id/members/:userId — remove member
router.delete('/:id/members/:userId', requireProjectRole(['admin']), (req, res) => {
  const db = getDB();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);

  if (project.owner_id == req.params.userId) {
    return res.status(400).json({ error: 'Cannot remove project owner' });
  }

  db.prepare(
    'DELETE FROM project_members WHERE project_id = ? AND user_id = ?'
  ).run(req.params.id, req.params.userId);

  res.json({ message: 'Member removed' });
});

module.exports = router;

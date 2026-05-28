const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { getDB } = require('../db/database');
const { authenticate, requireProjectRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const TASK_FIELDS = `
  t.*, 
  u1.name as assignee_name, u1.avatar_color as assignee_color,
  u2.name as creator_name,
  p.name as project_name, p.color as project_color
`;
const TASK_JOINS = `
  FROM tasks t
  LEFT JOIN users u1 ON t.assignee_id = u1.id
  LEFT JOIN users u2 ON t.creator_id = u2.id
  LEFT JOIN projects p ON t.project_id = p.id
`;

// GET /api/tasks — my tasks or filtered
router.get('/', (req, res) => {
  const db = getDB();
  const { status, priority, project_id, assignee, overdue } = req.query;

  let conditions = [];
  let params = [];

  if (req.user.system_role !== 'admin') {
    conditions.push(`t.project_id IN (
      SELECT project_id FROM project_members WHERE user_id = ?
    )`);
    params.push(req.user.id);
  }

  if (status) { conditions.push('t.status = ?'); params.push(status); }
  if (priority) { conditions.push('t.priority = ?'); params.push(priority); }
  if (project_id) { conditions.push('t.project_id = ?'); params.push(project_id); }
  if (assignee === 'me') { conditions.push('t.assignee_id = ?'); params.push(req.user.id); }
  if (overdue === 'true') {
    conditions.push("t.due_date < date('now') AND t.status != 'done'");
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const tasks = db.prepare(`SELECT ${TASK_FIELDS} ${TASK_JOINS} ${where} ORDER BY t.created_at DESC`).all(...params);

  res.json({ tasks });
});

// GET /api/tasks/stats — dashboard stats
router.get('/stats', (req, res) => {
  const db = getDB();
  
  let projectFilter = '';
  let params = [];

  if (req.user.system_role !== 'admin') {
    projectFilter = 'AND t.project_id IN (SELECT project_id FROM project_members WHERE user_id = ?)';
    params.push(req.user.id);
  }

  const statusCounts = db.prepare(`
    SELECT status, COUNT(*) as count FROM tasks t WHERE 1=1 ${projectFilter} GROUP BY status
  `).all(...params);

  const overdue = db.prepare(`
    SELECT COUNT(*) as count FROM tasks t WHERE due_date < date('now') AND status != 'done' ${projectFilter}
  `).get(...params);

  const myTasks = db.prepare(`
    SELECT COUNT(*) as count FROM tasks t WHERE t.assignee_id = ? AND status != 'done' ${projectFilter}
  `).get(req.user.id, ...params);

  const recentTasks = db.prepare(`
    SELECT ${TASK_FIELDS} ${TASK_JOINS} WHERE 1=1 ${projectFilter}
    ORDER BY t.created_at DESC LIMIT 5
  `).all(...params);

  const priorityCounts = db.prepare(`
    SELECT priority, COUNT(*) as count FROM tasks t WHERE status != 'done' ${projectFilter} GROUP BY priority
  `).all(...params);

  res.json({ statusCounts, overdue, myTasks, recentTasks, priorityCounts });
});

// POST /api/tasks — create task
router.post('/', [
  body('title').trim().isLength({ min: 1, max: 200 }),
  body('project_id').isInt(),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('assignee_id').optional().isInt(),
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('due_date').optional().isISO8601().toDate(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDB();
  const { title, description = '', project_id, assignee_id, status = 'todo', priority = 'medium', due_date } = req.body;

  // Check membership
  if (req.user.system_role !== 'admin') {
    const member = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(project_id, req.user.id);
    if (!member) return res.status(403).json({ error: 'Not a member of this project' });
  }

  const result = db.prepare(`
    INSERT INTO tasks (title, description, project_id, assignee_id, creator_id, status, priority, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, description, project_id, assignee_id || null, req.user.id, status, priority, due_date || null);

  const task = db.prepare(`SELECT ${TASK_FIELDS} ${TASK_JOINS} WHERE t.id = ?`).get(result.lastInsertRowid);
  res.status(201).json({ task });
});

// GET /api/tasks/:id
router.get('/:id', (req, res) => {
  const db = getDB();
  const task = db.prepare(`SELECT ${TASK_FIELDS} ${TASK_JOINS} WHERE t.id = ?`).get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (req.user.system_role !== 'admin') {
    const member = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(task.project_id, req.user.id);
    if (!member) return res.status(403).json({ error: 'Access denied' });
  }

  res.json({ task });
});

// PATCH /api/tasks/:id
router.patch('/:id', [
  body('title').optional().trim().isLength({ min: 1, max: 200 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('assignee_id').optional(),
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('due_date').optional(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDB();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (req.user.system_role !== 'admin') {
    const member = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(task.project_id, req.user.id);
    if (!member) return res.status(403).json({ error: 'Access denied' });
  }

  const { title, description, assignee_id, status, priority, due_date } = req.body;

  db.prepare(`
    UPDATE tasks SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      assignee_id = CASE WHEN ? IS NOT NULL THEN ? ELSE assignee_id END,
      status = COALESCE(?, status),
      priority = COALESCE(?, priority),
      due_date = COALESCE(?, due_date),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title || null, description || null,
    assignee_id !== undefined ? 1 : null, assignee_id || null,
    status || null, priority || null, due_date || null,
    req.params.id
  );

  const updated = db.prepare(`SELECT ${TASK_FIELDS} ${TASK_JOINS} WHERE t.id = ?`).get(req.params.id);
  res.json({ task: updated });
});

// DELETE /api/tasks/:id
router.delete('/:id', (req, res) => {
  const db = getDB();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (req.user.system_role !== 'admin') {
    const member = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(task.project_id, req.user.id);
    if (!member) return res.status(403).json({ error: 'Access denied' });
    if (member.role !== 'admin' && task.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'Only task creator or project admin can delete' });
    }
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ message: 'Task deleted' });
});

module.exports = router;

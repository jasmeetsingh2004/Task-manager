const jwt = require('jsonwebtoken');
const { getDB } = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow-secret-change-in-production';

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = getDB();
    const user = db.prepare('SELECT id, name, email, system_role, avatar_color FROM users WHERE id = ?').get(decoded.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireSystemAdmin(req, res, next) {
  if (req.user.system_role !== 'admin') {
    return res.status(403).json({ error: 'System admin access required' });
  }
  next();
}

function requireProjectRole(roles) {
  return (req, res, next) => {
    const db = getDB();
    const projectId = req.params.projectId || req.params.id || req.body.project_id;

    if (req.user.system_role === 'admin') return next();

    const member = db.prepare(
      'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?'
    ).get(projectId, req.user.id);

    if (!member) {
      return res.status(403).json({ error: 'Not a member of this project' });
    }

    if (roles && !roles.includes(member.role)) {
      return res.status(403).json({ error: 'Insufficient project permissions' });
    }

    req.projectRole = member.role;
    next();
  };
}

module.exports = { authenticate, requireSystemAdmin, requireProjectRole, JWT_SECRET };

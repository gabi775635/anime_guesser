// middleware/auth.js — Gestion des sessions dashboard
const crypto = require('crypto');

const sessions = new Map(); // token → expiry timestamp

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function createSession() {
  const token = generateToken();
  sessions.set(token, Date.now() + 8 * 60 * 60 * 1000); // 8h
  return token;
}

function destroySession(token) {
  sessions.delete(token);
}

function requireAuth(req, res, next) {
  const token = req.headers['x-dashboard-token'] || req.query.token;
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
  if (Date.now() > sessions.get(token)) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Session expirée' });
  }
  // Refresh silencieux : prolonge la session de 8h à chaque appel API
  sessions.set(token, Date.now() + 8 * 60 * 60 * 1000);
  next();
}

module.exports = { requireAuth, createSession, destroySession };

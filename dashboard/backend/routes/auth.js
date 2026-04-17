// routes/auth.js — Login / logout
const express = require('express');
const router  = express.Router();
const { requireAuth, createSession, destroySession } = require('../middleware/auth');

const DASHBOARD_USER = process.env.DASHBOARD_USER || 'admin';
const DASHBOARD_PASS = process.env.DASHBOARD_PASS || 'changeme';

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username !== DASHBOARD_USER || password !== DASHBOARD_PASS) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }
  const token = createSession();
  res.json({ token });
});

router.post('/logout', requireAuth, (req, res) => {
  const token = req.headers['x-dashboard-token'];
  destroySession(token);
  res.json({ success: true });
});

module.exports = router;

// Login / logout / "who am I" routes.
const { Router } = require('express');
const crypto = require('node:crypto');
const { SESSION_COOKIE, requireRole } = require('../session');
const { hashPassword } = require('../database');

module.exports = function authRoutes({ db, sessions }) {
  const router = Router();

  // POST /api/auth/login  { loginId, password }
  router.post('/login', (req, res) => {
    const { loginId, password } = req.body;
    if (!loginId || !password) {
      return res.status(400).json({ error: 'Please enter your ID and password.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE loginId = ?').get(loginId);
    if (!user || user.password !== hashPassword(password)) {
      return res.status(401).json({ error: 'Wrong ID or password.' });
    }

    // Create a random session token and remember it -> this user.
    const sessionToken = crypto.randomBytes(24).toString('hex');
    sessions.set(sessionToken, user.id);

    // Give the token to the browser as a cookie.
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${sessionToken}; Path=/; HttpOnly; SameSite=Lax`);
    res.json({
      user: { name: user.name, loginId: user.loginId, role: user.role, roomNumber: user.roomNumber },
    });
  });

  // POST /api/auth/logout
  router.post('/logout', (req, res) => {
    const sessionToken = readSessionToken(req);
    if (sessionToken) sessions.delete(sessionToken);
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; Max-Age=0`);
    res.json({ ok: true });
  });

  // GET /api/auth/me -> the logged-in user, so pages know who is viewing.
  router.get('/me', requireRole(), (req, res) => {
    res.json({
      user: { name: req.user.name, loginId: req.user.loginId, role: req.user.role, roomNumber: req.user.roomNumber },
    });
  });

  return router;
};

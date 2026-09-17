// Login / logout / "who am I" routes.
const { Router } = require('express');
const crypto = require('node:crypto');
const { SESSION_COOKIE, readSessionToken, requireRole } = require('../session');
const { hashPassword } = require('../database');

module.exports = function authRoutes({ db }) {
  const router = Router();

  // POST /api/auth/login  { loginId, password }
  router.post('/login', async (req, res) => {
    try {
      const { loginId, password } = req.body || {};
      if (!loginId || !password) {
        return res.status(400).json({ error: 'Please enter your ID and password.' });
      }

      const user = await db.get('SELECT * FROM users WHERE loginId = ?', [loginId]);
      if (!user || user.password !== hashPassword(password)) {
        return res.status(401).json({ error: 'Wrong ID or password.' });
      }

      // Create a random session token and save it to the database table
      const sessionToken = crypto.randomBytes(24).toString('hex');
      await db.run('INSERT INTO sessions (token, userId, createdAt) VALUES (?, ?, ?)', [
        sessionToken,
        user.id,
        new Date().toISOString(),
      ]);

      // Give the token to the browser as a cookie (for same-origin or proxied setups)
      res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${sessionToken}; Path=/; HttpOnly; SameSite=Lax`);

      // Also return the token in JSON for localStorage (for cross-origin setups)
      res.json({
        token: sessionToken,
        user: { name: user.name, loginId: user.loginId, role: user.role, roomNumber: user.roomNumber },
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Failed to log in. Please try again.' });
    }
  });

  // POST /api/auth/logout
  router.post('/logout', async (req, res) => {
    try {
      const sessionToken = readSessionToken(req);
      if (sessionToken) {
        await db.run('DELETE FROM sessions WHERE token = ?', [sessionToken]);
      }
      res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; Max-Age=0`);
      res.json({ ok: true });
    } catch (err) {
      console.error('Logout error:', err);
      res.status(500).json({ error: 'Failed to log out.' });
    }
  });

  // GET /api/auth/me -> the logged-in user, so pages know who is viewing.
  router.get('/me', requireRole(), (req, res) => {
    res.json({
      user: { name: req.user.name, loginId: req.user.loginId, role: req.user.role, roomNumber: req.user.roomNumber },
    });
  });

  return router;
};

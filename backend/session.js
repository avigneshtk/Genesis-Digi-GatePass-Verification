// Small helpers about "who is logged in", shared by server.js and the routes.

// The browser stores the session token in a cookie with this name.
const SESSION_COOKIE = 'gp_session';

// Reads the session token out of Authorization header, custom header, query param, or Cookie.
function readSessionToken(req) {
  // 1. Bearer token in Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) return token;
  }

  // 2. Custom header
  if (req.headers['x-session-token']) {
    return req.headers['x-session-token'];
  }

  // 3. Query parameter (useful for loading QR image tags cross-origin)
  if (req.query && req.query.token) {
    return req.query.token;
  }

  // 4. Cookie
  const cookies = req.headers.cookie;
  if (cookies) {
    for (const part of cookies.split(';')) {
      const [name, value] = part.trim().split('=');
      if (name === SESSION_COOKIE && value) return value;
    }
  }

  return null;
}

// Express middleware: only let the request through if the user is logged in
// and (when role names are given) has one of those roles.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Please log in first.' });
    }
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You are not allowed to do that.' });
    }
    next();
  };
}

module.exports = { SESSION_COOKIE, readSessionToken, requireRole };

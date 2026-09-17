// Small helpers about "who is logged in", shared by server.js and the routes.

// The browser stores the session token in a cookie with this name.
const SESSION_COOKIE = 'gp_session';

// Reads the session token out of the request's Cookie header (or null).
function readSessionToken(req) {
  const cookies = req.headers.cookie;
  if (!cookies) return null;
  for (const part of cookies.split(';')) {
    const [name, value] = part.trim().split('=');
    if (name === SESSION_COOKIE) return value;
  }
  return null;
}

// Express middleware: only let the request through if the user is logged in
// and (when role names are given) has one of those roles.
// Usage: requireRole('STUDENT')  or  requireRole() for any logged-in user.
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

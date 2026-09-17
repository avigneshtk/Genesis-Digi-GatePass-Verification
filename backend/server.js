// Starts the web server: it serves the frontend pages and the /api routes.
// Run with:  npm start   then open http://localhost:3000
const express = require('express');
const path = require('node:path');

const { openDatabase } = require('./database');
const authRoutes = require('./routes/auth');
const gatePassRoutes = require('./routes/gatepass');
const securityRoutes = require('./routes/security');
const { readSessionToken } = require('./session');

const PORT = 3000;

const db = openDatabase();
const app = express();

// Sessions are kept in memory: { sessionToken: userId }.
// Restarting the server logs everyone out - that is fine for a hackathon demo.
const sessions = new Map();

// Read JSON request bodies (e.g. the login form posts JSON).
app.use(express.json());

// Make the logged-in user available in every route as req.user (or null).
app.use((req, res, next) => {
  const sessionToken = readSessionToken(req);
  const userId = sessionToken ? sessions.get(sessionToken) : null;
  req.user = userId
    ? db.prepare('SELECT * FROM users WHERE id = ?').get(userId)
    : null;
  next();
});

app.use('/api/auth', authRoutes({ db, sessions }));
app.use('/api/gatepasses', gatePassRoutes({ db }));
app.use('/api/security', securityRoutes({ db }));

// Serve the frontend files (index.html, student.html, css, js...).
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.listen(PORT, () => {
  console.log(`Hostel Gatepass running at http://localhost:${PORT}`);
  console.log('Demo logins: STU001/student123, WARDEN01/warden123, SEC01/security123');
});

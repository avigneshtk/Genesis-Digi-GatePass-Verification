// Starts the web server: it serves the /api routes and static frontend pages.
// Run with:  npm start   then open http://localhost:3000
const express = require('express');
const cors = require('cors');
const path = require('node:path');

const { openDatabase } = require('./database');
const authRoutes = require('./routes/auth');
const gatePassRoutes = require('./routes/gatepass');
const securityRoutes = require('./routes/security');
const { readSessionToken } = require('./session');

const PORT = process.env.PORT || 3000;

async function createApp() {
  const db = await openDatabase();
  const app = express();

  // Allow requests from Vercel frontend, custom FRONTEND_URL, and localhost
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const allowedFrontend = process.env.FRONTEND_URL;
        if (
          (allowedFrontend && origin === allowedFrontend) ||
          origin.endsWith('.vercel.app') ||
          origin.includes('localhost') ||
          origin.includes('127.0.0.1')
        ) {
          return callback(null, true);
        }
        // Permissive fallback for hackathon demos
        return callback(null, true);
      },
      credentials: true,
    })
  );

  // Read JSON request bodies
  app.use(express.json());

  // Make the logged-in user available in every route as req.user (or null)
  app.use(async (req, res, next) => {
    try {
      const sessionToken = readSessionToken(req);
      if (!sessionToken) {
        req.user = null;
        return next();
      }

      const session = await db.get('SELECT userId FROM sessions WHERE token = ?', [sessionToken]);
      if (!session) {
        req.user = null;
        return next();
      }

      req.user = await db.get('SELECT * FROM users WHERE id = ?', [session.userId]);
      next();
    } catch (err) {
      console.error('Session middleware error:', err);
      req.user = null;
      next();
    }
  });

  // Health check endpoint for monitoring (e.g. Render / Railway health checks)
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      database: db.isCloud ? 'turso' : 'sqlite-local',
      timestamp: new Date().toISOString(),
    });
  });

  // API Routes
  app.use('/api/auth', authRoutes({ db }));
  app.use('/api/gatepasses', gatePassRoutes({ db }));
  app.use('/api/security', securityRoutes({ db }));

  // Serve static frontend files (works seamlessly when running monolith locally)
  app.use(express.static(path.join(__dirname, '..', 'frontend')));

  return { app, db };
}

async function startServer() {
  const { app, db } = await createApp();

  app.listen(PORT, () => {
    console.log(`Hostel Gatepass backend running at http://localhost:${PORT}`);
    console.log(`Database mode: ${db.isCloud ? 'Turso Cloud' : 'Local SQLite'}`);
    console.log('Demo logins: STU001/student123, WARDEN01/warden123, SEC01/security123');
  });
}

// Start if executed directly
if (require.main === module) {
  startServer().catch((err) => {
    console.error('Server startup failed:', err);
    process.exit(1);
  });
}

module.exports = { createApp, startServer };

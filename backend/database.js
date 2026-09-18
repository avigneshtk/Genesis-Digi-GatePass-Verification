// Database connection and initialization.
// Supports both:
// 1. Cloud Database (Turso / libSQL) via TURSO_DATABASE_URL + TURSO_AUTH_TOKEN (or DATABASE_URL)
// 2. Local SQLite file (data/gatepass.db) for local offline development.
const { createClient } = require('@libsql/client');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

// Turns a password into a fixed hash, so we never store the plain password.
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function openDatabase() {
  const isCloud = Boolean(process.env.TURSO_DATABASE_URL || (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('libsql://')));
  const dbUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  let client;

  if (isCloud && dbUrl) {
    console.log(`[Database] Connecting to cloud Turso database at ${dbUrl.split('@').pop()}`);
    client = createClient({
      url: dbUrl,
      authToken: authToken,
    });
  } else {
    const localDbPath = path.join(__dirname, '..', 'data', 'gatepass.db');
    fs.mkdirSync(path.dirname(localDbPath), { recursive: true });
    console.log(`[Database] Using local SQLite database file at ${localDbPath}`);
    client = createClient({
      url: `file:${localDbPath}`,
    });
  }

  // Friendly beginner-style helpers wrapping @libsql/client
  const db = {
    // Get a single row or null
    async get(sql, args = []) {
      const rs = await client.execute({ sql, args });
      return rs.rows.length > 0 ? rs.rows[0] : null;
    },

    // Get all matching rows as an array
    async all(sql, args = []) {
      const rs = await client.execute({ sql, args });
      return rs.rows;
    },

    // Run an INSERT, UPDATE, or DELETE
    async run(sql, args = []) {
      const rs = await client.execute({ sql, args });
      return {
        lastInsertRowid: rs.lastInsertRowid !== undefined ? Number(rs.lastInsertRowid) : null,
        rowsAffected: rs.rowsAffected,
      };
    },

    // Run multiple SQL statements (for table creation)
    async exec(sql) {
      return await client.executeMultiple(sql);
    },

    client,
    isCloud,
  };

  // Create tables if they do not exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loginId TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      roomNumber TEXT
    );

    CREATE TABLE IF NOT EXISTS gate_passes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studentId INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'NORMAL',
      reason TEXT NOT NULL,
      destination TEXT,
      fromDateTime TEXT NOT NULL,
      toDateTime TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      qrToken TEXT
    );

    CREATE TABLE IF NOT EXISTS gate_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gatePassId INTEGER NOT NULL,
      studentId INTEGER NOT NULL,
      action TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      userId INTEGER NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);

  // Migrate existing tables if they lack the new columns
  try {
    const tableInfo = await db.all('PRAGMA table_info(gate_passes)');
    const colNames = tableInfo.map((c) => c.name);
    if (!colNames.includes('type')) {
      await db.exec("ALTER TABLE gate_passes ADD COLUMN type TEXT NOT NULL DEFAULT 'NORMAL'");
    }
    if (!colNames.includes('destination')) {
      await db.exec('ALTER TABLE gate_passes ADD COLUMN destination TEXT');
    }
    if (!colNames.includes('description')) {
      await db.exec('ALTER TABLE gate_passes ADD COLUMN description TEXT');
    }
  } catch (migErr) {
    console.warn('[Database] Migration note:', migErr.message);
  }

  await seedDemoUsers(db);
  return db;
}

// Add demo users once so the app works out of the box.
async function seedDemoUsers(db) {
  const demoUsers = [
    { loginId: 'STU001', name: 'Rahul', password: 'student123', role: 'STUDENT', roomNumber: 'B-204' },
    { loginId: 'STU002', name: 'Priya', password: 'student123', role: 'STUDENT', roomNumber: 'A-101' },
    { loginId: 'WARDEN01', name: 'Mr. Sharma', password: 'warden123', role: 'WARDEN', roomNumber: null },
    { loginId: 'SEC01', name: 'Gate Security', password: 'security123', role: 'SECURITY', roomNumber: null },
  ];

  for (const user of demoUsers) {
    const existing = await db.get('SELECT id FROM users WHERE loginId = ?', [user.loginId]);
    if (!existing) {
      await db.run(
        'INSERT INTO users (loginId, name, password, role, roomNumber) VALUES (?, ?, ?, ?, ?)',
        [user.loginId, user.name, hashPassword(user.password), user.role, user.roomNumber]
      );
    }
  }
}

module.exports = { openDatabase, hashPassword };

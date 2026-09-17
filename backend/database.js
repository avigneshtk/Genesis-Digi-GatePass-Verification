// Opens the SQLite database, creates the tables and fills in demo users.
// The whole database is one file: data/gatepass.db (delete it to reset all data).
// We use Node's built-in "node:sqlite" module, so there is no database server to install.
const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DB_PATH = path.join(__dirname, '..', 'data', 'gatepass.db');

// Turns a password into a fixed hash, so we never store the plain password.
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function openDatabase() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);

  db.exec(`
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
      reason TEXT NOT NULL,
      fromDateTime TEXT NOT NULL,
      toDateTime TEXT NOT NULL,
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
  `);

  seedDemoUsers(db);
  return db;
}

// Add the demo users once, so the app works out of the box.
function seedDemoUsers(db) {
  const demoUsers = [
    { loginId: 'STU001', name: 'Rahul', password: 'student123', role: 'STUDENT', roomNumber: 'B-204' },
    { loginId: 'STU002', name: 'Priya', password: 'student123', role: 'STUDENT', roomNumber: 'A-101' },
    { loginId: 'WARDEN01', name: 'Mr. Sharma', password: 'warden123', role: 'WARDEN', roomNumber: null },
    { loginId: 'SEC01', name: 'Gate Security', password: 'security123', role: 'SECURITY', roomNumber: null },
  ];

  const findUser = db.prepare('SELECT id FROM users WHERE loginId = ?');
  const insertUser = db.prepare(
    'INSERT INTO users (loginId, name, password, role, roomNumber) VALUES (?, ?, ?, ?, ?)'
  );

  for (const user of demoUsers) {
    const existing = findUser.get(user.loginId);
    if (!existing) {
      insertUser.run(user.loginId, user.name, hashPassword(user.password), user.role, user.roomNumber);
    }
  }
}

module.exports = { openDatabase, hashPassword };

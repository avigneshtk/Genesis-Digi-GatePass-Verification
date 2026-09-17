// Security routes: verify a QR token and record entry/exit, plus the gate activity log.
const { Router } = require('express');
const { requireRole } = require('../session');

module.exports = function securityRoutes({ db }) {
  const router = Router();

  // Turns a stored pass row into the answer for the security screen.
  function checkPass(pass) {
    const student = db.prepare('SELECT name, loginId, roomNumber FROM users WHERE id = ?').get(pass.studentId);

    if (pass.status === 'PENDING') {
      return { valid: false, reason: 'This pass has not been approved by the warden yet.' };
    }
    if (pass.status === 'REJECTED') {
      return { valid: false, reason: 'This pass was rejected by the warden.' };
    }
    // Approved passes expire when the return time has passed.
    if (new Date(pass.toDateTime) < new Date()) {
      return { valid: false, reason: 'This pass has expired.' };
    }

    return {
      valid: true,
      pass: {
        id: pass.id,
        studentName: student.name,
        studentLoginId: student.loginId,
        roomNumber: student.roomNumber,
        reason: pass.reason,
        fromDateTime: pass.fromDateTime,
        toDateTime: pass.toDateTime,
        qrToken: pass.qrToken,
      },
    };
  }

  // GET /api/security/verify?token=GP-XXXX
  // Security types the token (or scans the QR) and gets back if the pass is valid.
  router.get('/verify', requireRole('SECURITY'), (req, res) => {
    const token = (req.query.token || '').trim();
    if (!token) return res.status(400).json({ error: 'Please enter or scan a pass token.' });

    const pass = db.prepare('SELECT * FROM gate_passes WHERE qrToken = ?').get(token);
    if (!pass) {
      return res.json({ valid: false, reason: 'No gate pass found for this token.' });
    }
    res.json(checkPass(pass));
  });

  // POST /api/security/record  { gatePassId, action: 'ENTRY' | 'EXIT' }
  // Saves the entry/exit record and returns the updated pass info.
  router.post('/record', requireRole('SECURITY'), (req, res) => {
    const { gatePassId, action } = req.body;
    if (action !== 'ENTRY' && action !== 'EXIT') {
      return res.status(400).json({ error: 'Action must be ENTRY or EXIT.' });
    }

    const pass = db.prepare('SELECT * FROM gate_passes WHERE id = ?').get(gatePassId);
    if (!pass) return res.status(404).json({ error: 'Gate pass not found.' });

    // Same action twice in a row would be a mistake - warn the guard.
    const lastLog = db.prepare('SELECT * FROM gate_logs WHERE gatePassId = ? ORDER BY id DESC LIMIT 1').get(pass.id);
    if (lastLog && lastLog.action === action) {
      return res.status(400).json({ error: `${action === 'ENTRY' ? 'An ENTRY' : 'An EXIT'} was already recorded for this pass.` });
    }

    db.prepare('INSERT INTO gate_logs (gatePassId, studentId, action, timestamp) VALUES (?, ?, ?, ?)')
      .run(pass.id, pass.studentId, action, new Date().toISOString());

    res.json(checkPass(pass));
  });

  // GET /api/security/activity
  // Recent gate activity for the security screen.
  router.get('/activity', requireRole('SECURITY', 'WARDEN'), (req, res) => {
    const logs = db.prepare(`
      SELECT gate_logs.*, users.name AS studentName, users.roomNumber, gate_passes.reason
      FROM gate_logs
      JOIN users ON users.id = gate_logs.studentId
      JOIN gate_passes ON gate_passes.id = gate_logs.gatePassId
      ORDER BY gate_logs.id DESC
      LIMIT 20
    `).all();
    res.json({ logs });
  });

  return router;
};

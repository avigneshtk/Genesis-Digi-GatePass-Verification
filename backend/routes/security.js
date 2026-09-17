// Security routes: verify a QR token and record entry/exit, plus the gate activity log.
const { Router } = require('express');
const { requireRole } = require('../session');

module.exports = function securityRoutes({ db }) {
  const router = Router();

  // Turns a stored pass row into the answer for the security screen.
  async function checkPass(pass) {
    const student = await db.get('SELECT name, loginId, roomNumber FROM users WHERE id = ?', [pass.studentId]);

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
        studentName: student ? student.name : 'Unknown',
        studentLoginId: student ? student.loginId : '-',
        roomNumber: student ? student.roomNumber : '-',
        reason: pass.reason,
        fromDateTime: pass.fromDateTime,
        toDateTime: pass.toDateTime,
        qrToken: pass.qrToken,
      },
    };
  }

  // GET /api/security/verify?token=GP-XXXX
  // Security types the token (or scans the QR) and gets back if the pass is valid.
  router.get('/verify', requireRole('SECURITY'), async (req, res) => {
    try {
      const token = (req.query.token || '').trim();
      if (!token) return res.status(400).json({ error: 'Please enter or scan a pass token.' });

      const pass = await db.get('SELECT * FROM gate_passes WHERE qrToken = ?', [token]);
      if (!pass) {
        return res.json({ valid: false, reason: 'No gate pass found for this token.' });
      }
      res.json(await checkPass(pass));
    } catch (err) {
      console.error('Verify pass error:', err);
      res.status(500).json({ error: 'Failed to verify pass.' });
    }
  });

  // POST /api/security/record  { gatePassId, action: 'ENTRY' | 'EXIT' }
  // Saves the entry/exit record and returns the updated pass info.
  router.post('/record', requireRole('SECURITY'), async (req, res) => {
    try {
      const { gatePassId, action } = req.body || {};
      if (action !== 'ENTRY' && action !== 'EXIT') {
        return res.status(400).json({ error: 'Action must be ENTRY or EXIT.' });
      }

      const pass = await db.get('SELECT * FROM gate_passes WHERE id = ?', [gatePassId]);
      if (!pass) return res.status(404).json({ error: 'Gate pass not found.' });

      // Same action twice in a row would be a mistake - warn the guard.
      const lastLog = await db.get('SELECT * FROM gate_logs WHERE gatePassId = ? ORDER BY id DESC LIMIT 1', [pass.id]);
      if (lastLog && lastLog.action === action) {
        return res.status(400).json({
          error: `${action === 'ENTRY' ? 'An ENTRY' : 'An EXIT'} was already recorded for this pass.`,
        });
      }

      await db.run(
        'INSERT INTO gate_logs (gatePassId, studentId, action, timestamp) VALUES (?, ?, ?, ?)',
        [pass.id, pass.studentId, action, new Date().toISOString()]
      );

      res.json(await checkPass(pass));
    } catch (err) {
      console.error('Record gate action error:', err);
      res.status(500).json({ error: 'Failed to record entry/exit.' });
    }
  });

  // GET /api/security/activity
  // Recent gate activity for the security screen.
  router.get('/activity', requireRole('SECURITY', 'WARDEN'), async (req, res) => {
    try {
      const logs = await db.all(`
        SELECT gate_logs.*, users.name AS studentName, users.roomNumber, gate_passes.reason
        FROM gate_logs
        JOIN users ON users.id = gate_logs.studentId
        JOIN gate_passes ON gate_passes.id = gate_logs.gatePassId
        ORDER BY gate_logs.id DESC
        LIMIT 20
      `);
      res.json({ logs });
    } catch (err) {
      console.error('Activity logs error:', err);
      res.status(500).json({ error: 'Failed to fetch gate activity.' });
    }
  });

  return router;
};

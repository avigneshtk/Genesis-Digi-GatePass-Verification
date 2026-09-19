// Security routes: verify a QR token and record two-stage entry/exit, plus gate activity log.
const { Router } = require('express');
const { requireRole } = require('../session');

module.exports = function securityRoutes({ db }) {
  const router = Router();

  // Turns a stored pass row into the answer for the security screen.
  async function checkPass(pass) {
    if (!pass) return { valid: false, reason: 'No gate pass found.' };
    const student = await db.get('SELECT name, loginId, roomNumber FROM users WHERE id = ?', [pass.studentId]);

    const passInfo = {
      id: pass.id,
      studentName: student ? student.name : 'Unknown',
      studentLoginId: student ? student.loginId : '-',
      roomNumber: student ? student.roomNumber : '-',
      type: pass.type || 'NORMAL',
      reason: pass.reason,
      destination: pass.destination || '',
      description: pass.description || '',
      fromDateTime: pass.fromDateTime,
      toDateTime: pass.toDateTime,
      status: pass.status,
      qrToken: pass.qrToken,
    };

    if (pass.status === 'CANCELLED') {
      return {
        valid: false,
        status: pass.status,
        reason: 'This gate pass has been cancelled by the student.',
        pass: passInfo,
      };
    }
    if (pass.status === 'PENDING') {
      return {
        valid: false,
        status: pass.status,
        reason: 'This gate pass has not been approved by the warden yet.',
        pass: passInfo,
      };
    }
    if (pass.status === 'REJECTED') {
      return {
        valid: false,
        status: pass.status,
        reason: 'This gate pass was rejected by the warden.',
        pass: passInfo,
      };
    }
    if (pass.status === 'RETURNED') {
      return {
        valid: false,
        status: pass.status,
        reason: 'This gate pass has already been completed. Student has already RETURNED to the hostel.',
        pass: passInfo,
      };
    }

    const now = new Date();
    const returnTime = new Date(pass.toDateTime);

    // APPROVED pass is valid for EXIT (leaving hostel)
    if (pass.status === 'APPROVED') {
      if (returnTime < now) {
        return {
          valid: false,
          status: 'EXPIRED',
          reason: 'This gate pass has expired (validity period ended).',
          pass: passInfo,
        };
      }
      return {
        valid: true,
        status: 'APPROVED',
        nextAction: 'EXIT',
        headline: 'READY FOR EXIT',
        message: 'Pass is valid for EXIT. Student may leave the hostel.',
        pass: passInfo,
      };
    }

    // OUT pass is valid for ENTRY (returning to hostel)
    if (pass.status === 'OUT') {
      const isLate = returnTime < now;
      return {
        valid: true,
        status: 'OUT',
        nextAction: 'ENTRY',
        headline: 'CURRENTLY OUT — READY FOR ENTRY',
        message: isLate
          ? 'Student is returning after expected return time (Late Entry).'
          : 'Pass is valid for ENTRY. Student may enter the hostel.',
        isLate,
        pass: passInfo,
      };
    }

    return {
      valid: false,
      status: pass.status,
      reason: `Invalid pass state: ${pass.status}`,
      pass: passInfo,
    };
  }

  // GET /api/security/verify?token=GP-XXXX
  // Security types the token (or scans the QR) and gets back validation result.
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

  // POST /api/security/record  { gatePassId, qrToken, action: 'EXIT' | 'ENTRY' }
  // Strictly enforces two-stage state transition: APPROVED -> OUT -> RETURNED.
  router.post('/record', requireRole('SECURITY'), async (req, res) => {
    try {
      const { gatePassId, qrToken, action } = req.body || {};
      if (action !== 'ENTRY' && action !== 'EXIT') {
        return res.status(400).json({ error: 'Action must be ENTRY or EXIT.' });
      }

      let pass;
      if (gatePassId) {
        pass = await db.get('SELECT * FROM gate_passes WHERE id = ?', [gatePassId]);
      } else if (qrToken) {
        pass = await db.get('SELECT * FROM gate_passes WHERE qrToken = ?', [qrToken.trim()]);
      }

      if (!pass) return res.status(404).json({ error: 'Gate pass not found.' });

      if (pass.status === 'CANCELLED') {
        return res.status(400).json({ error: 'Cannot record action: gate pass has been CANCELLED.' });
      }
      if (pass.status === 'PENDING') {
        return res.status(400).json({ error: 'Cannot record action: pass is still PENDING warden approval.' });
      }
      if (pass.status === 'REJECTED') {
        return res.status(400).json({ error: 'Cannot record action: pass was REJECTED by the warden.' });
      }
      if (pass.status === 'RETURNED') {
        return res.status(400).json({ error: 'This pass has already been used and completed. Student has already RETURNED.' });
      }

      const now = new Date();

      if (action === 'EXIT') {
        if (pass.status === 'OUT') {
          return res.status(400).json({ error: 'Student has already exited the hostel (Current state is OUT).' });
        }
        if (pass.status !== 'APPROVED') {
          return res.status(400).json({ error: `Cannot record EXIT for pass with status ${pass.status}.` });
        }
        if (new Date(pass.toDateTime) < now) {
          return res.status(400).json({ error: 'Cannot exit: Gate pass has already expired.' });
        }

        // Transition: APPROVED -> OUT
        await db.run("UPDATE gate_passes SET status = 'OUT' WHERE id = ?", [pass.id]);
        await db.run(
          'INSERT INTO gate_logs (gatePassId, studentId, action, timestamp) VALUES (?, ?, ?, ?)',
          [pass.id, pass.studentId, 'EXIT', now.toISOString()]
        );

        const updated = await db.get('SELECT * FROM gate_passes WHERE id = ?', [pass.id]);
        const check = await checkPass(updated);
        return res.json({
          ...check,
          success: true,
          action: 'EXIT',
          headline: 'OUT FROM GATE',
          message: 'Gate pass verified successfully. Student has exited the hostel.',
        });
      }

      if (action === 'ENTRY') {
        if (pass.status === 'APPROVED') {
          return res.status(400).json({ error: 'Student has not exited yet. Must record EXIT before ENTRY.' });
        }
        if (pass.status !== 'OUT') {
          return res.status(400).json({ error: `Cannot record ENTRY for pass with status ${pass.status}.` });
        }

        // Transition: OUT -> RETURNED
        await db.run("UPDATE gate_passes SET status = 'RETURNED' WHERE id = ?", [pass.id]);
        await db.run(
          'INSERT INTO gate_logs (gatePassId, studentId, action, timestamp) VALUES (?, ?, ?, ?)',
          [pass.id, pass.studentId, 'ENTRY', now.toISOString()]
        );

        const updated = await db.get('SELECT * FROM gate_passes WHERE id = ?', [pass.id]);
        const check = await checkPass(updated);
        return res.json({
          ...check,
          success: true,
          action: 'ENTRY',
          headline: 'WELCOME TO HOSTEL',
          message: 'Welcome to hostel! Entry recorded successfully.',
        });
      }
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
        SELECT gate_logs.*, users.name AS studentName, users.roomNumber, gate_passes.reason, gate_passes.type AS passType
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

// Gate pass routes: apply, list, approve, reject and the QR code image.
const { Router } = require('express');
const crypto = require('node:crypto');
const QRCode = require('qrcode');
const { requireRole } = require('../session');

module.exports = function gatePassRoutes({ db }) {
  const router = Router();

  // Turns a stored pass row + student into the object the frontend shows.
  async function passWithStudent(pass) {
    if (!pass) return null;
    const student = await db.get('SELECT name, loginId, roomNumber FROM users WHERE id = ?', [pass.studentId]);
    return {
      ...pass,
      type: pass.type || 'NORMAL',
      destination: pass.destination || '',
      description: pass.description || '',
      studentName: student ? student.name : 'Unknown',
      studentLoginId: student ? student.loginId : '-',
      roomNumber: student ? student.roomNumber : '-',
    };
  }

  // POST /api/gatepasses  { type, reason, destination, fromDateTime, toDateTime, description }
  // Students apply for a new pass.
  router.post('/', requireRole('STUDENT'), async (req, res) => {
    try {
      const { type, reason, destination, fromDateTime, toDateTime, description } = req.body || {};
      const passType = type === 'EMERGENCY' ? 'EMERGENCY' : 'NORMAL';

      if (!reason || !fromDateTime || !toDateTime) {
        return res.status(400).json({ error: 'Please fill in reason, leaving time and return time.' });
      }

      if (passType === 'EMERGENCY' && !destination) {
        return res.status(400).json({ error: 'Please specify the destination for emergency pass.' });
      }

      if (new Date(toDateTime) <= new Date(fromDateTime)) {
        return res.status(400).json({ error: 'Return time must be after leaving time.' });
      }

      const result = await db.run(
        "INSERT INTO gate_passes (studentId, type, reason, destination, fromDateTime, toDateTime, description, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')",
        [req.user.id, passType, reason.trim(), destination ? destination.trim() : null, fromDateTime, toDateTime, description ? description.trim() : null]
      );

      const pass = await db.get('SELECT * FROM gate_passes WHERE id = ?', [result.lastInsertRowid]);
      res.status(201).json({ pass: await passWithStudent(pass) });
    } catch (err) {
      console.error('Create gatepass error:', err);
      res.status(500).json({ error: 'Failed to create gate pass.' });
    }
  });

  // GET /api/gatepasses
  // Students see their own passes; wardens see everyone's passes.
  router.get('/', requireRole('STUDENT', 'WARDEN'), async (req, res) => {
    try {
      let rows;
      if (req.user.role === 'WARDEN') {
        rows = await db.all('SELECT * FROM gate_passes ORDER BY id DESC');
      } else {
        rows = await db.all('SELECT * FROM gate_passes WHERE studentId = ? ORDER BY id DESC', [req.user.id]);
      }
      const passes = await Promise.all(rows.map(passWithStudent));
      res.json({ passes });
    } catch (err) {
      console.error('List gatepasses error:', err);
      res.status(500).json({ error: 'Failed to fetch gate passes.' });
    }
  });

  // POST /api/gatepasses/approve-all   (warden only - bulk approve all pending passes)
  router.post('/approve-all', requireRole('WARDEN'), async (req, res) => {
    try {
      const pendingPasses = await db.all("SELECT * FROM gate_passes WHERE status = 'PENDING'");
      if (pendingPasses.length === 0) {
        return res.json({ success: true, count: 0, message: 'No pending requests to approve.' });
      }

      for (const pass of pendingPasses) {
        const qrToken = 'GP-' + crypto.randomBytes(4).toString('hex').toUpperCase();
        await db.run("UPDATE gate_passes SET status = 'APPROVED', qrToken = ? WHERE id = ?", [qrToken, pass.id]);
      }

      res.json({
        success: true,
        count: pendingPasses.length,
        message: `Successfully approved all ${pendingPasses.length} pending requests.`,
      });
    } catch (err) {
      console.error('Approve all error:', err);
      res.status(500).json({ error: 'Failed to bulk-approve gate passes.' });
    }
  });

  // POST /api/gatepasses/:id/approve   (warden only)
  router.post('/:id/approve', requireRole('WARDEN'), async (req, res) => {
    try {
      const pass = await db.get('SELECT * FROM gate_passes WHERE id = ?', [req.params.id]);
      if (!pass) return res.status(404).json({ error: 'Gate pass not found.' });
      if (pass.status !== 'PENDING') {
        return res.status(400).json({ error: 'Only pending passes can be approved.' });
      }

      // The QR code contains only this random token - never any personal data.
      const qrToken = 'GP-' + crypto.randomBytes(4).toString('hex').toUpperCase();
      await db.run("UPDATE gate_passes SET status = 'APPROVED', qrToken = ? WHERE id = ?", [qrToken, pass.id]);

      const updated = await db.get('SELECT * FROM gate_passes WHERE id = ?', [pass.id]);
      res.json({ pass: await passWithStudent(updated) });
    } catch (err) {
      console.error('Approve pass error:', err);
      res.status(500).json({ error: 'Failed to approve gate pass.' });
    }
  });

  // POST /api/gatepasses/:id/reject   (warden only)
  router.post('/:id/reject', requireRole('WARDEN'), async (req, res) => {
    try {
      const pass = await db.get('SELECT * FROM gate_passes WHERE id = ?', [req.params.id]);
      if (!pass) return res.status(404).json({ error: 'Gate pass not found.' });
      if (pass.status !== 'PENDING') {
        return res.status(400).json({ error: 'Only pending passes can be rejected.' });
      }

      await db.run("UPDATE gate_passes SET status = 'REJECTED' WHERE id = ?", [pass.id]);
      const updated = await db.get('SELECT * FROM gate_passes WHERE id = ?', [pass.id]);
      res.json({ pass: await passWithStudent(updated) });
    } catch (err) {
      console.error('Reject pass error:', err);
      res.status(500).json({ error: 'Failed to reject gate pass.' });
    }
  });

  // GET /api/gatepasses/:id/qr   (student only, own pass, or warden/security)
  // Returns the QR code as a PNG image the student can show or download.
  router.get('/:id/qr', requireRole('STUDENT', 'WARDEN', 'SECURITY'), async (req, res) => {
    try {
      const pass = await db.get('SELECT * FROM gate_passes WHERE id = ?', [req.params.id]);
      if (!pass) {
        return res.status(404).json({ error: 'Gate pass not found.' });
      }
      if (req.user.role === 'STUDENT' && pass.studentId !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to view this pass QR.' });
      }
      if (!pass.qrToken || (pass.status !== 'APPROVED' && pass.status !== 'OUT' && pass.status !== 'RETURNED')) {
        return res.status(400).json({ error: 'This pass has no active QR code.' });
      }

      const isDownload = req.query.download === '1' || req.query.download === 'true';

      QRCode.toBuffer(pass.qrToken, { width: 320, margin: 2 }, (error, buffer) => {
        if (error) return res.status(500).json({ error: 'Could not create the QR code.' });
        res.setHeader('Content-Type', 'image/png');
        if (isDownload) {
          res.setHeader('Content-Disposition', `attachment; filename="gatepass-${pass.qrToken}.png"`);
        } else {
          res.setHeader('Cache-Control', 'public, max-age=3600');
        }
        res.send(buffer);
      });
    } catch (err) {
      console.error('QR code error:', err);
      res.status(500).json({ error: 'Could not load QR code.' });
    }
  });

  return router;
};

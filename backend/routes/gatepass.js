// Gate pass routes: apply, list, approve, reject and the QR code image.
const { Router } = require('express');
const crypto = require('node:crypto');
const QRCode = require('qrcode');
const { requireRole } = require('../session');

module.exports = function gatePassRoutes({ db }) {
  const router = Router();

  // Turns a stored pass row + student into the object the frontend shows.
  function passWithStudent(pass) {
    const student = db.prepare('SELECT name, loginId, roomNumber FROM users WHERE id = ?').get(pass.studentId);
    return { ...pass, studentName: student.name, studentLoginId: student.loginId, roomNumber: student.roomNumber };
  }

  // POST /api/gatepasses  { reason, fromDateTime, toDateTime }
  // Students apply for a new pass.
  router.post('/', requireRole('STUDENT'), (req, res) => {
    const { reason, fromDateTime, toDateTime } = req.body;
    if (!reason || !fromDateTime || !toDateTime) {
      return res.status(400).json({ error: 'Please fill in reason, leaving time and return time.' });
    }
    if (new Date(toDateTime) <= new Date(fromDateTime)) {
      return res.status(400).json({ error: 'Return time must be after leaving time.' });
    }

    const result = db.prepare(
      "INSERT INTO gate_passes (studentId, reason, fromDateTime, toDateTime, status) VALUES (?, ?, ?, ?, 'PENDING')"
    ).run(req.user.id, reason, fromDateTime, toDateTime);

    const pass = db.prepare('SELECT * FROM gate_passes WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ pass: passWithStudent(pass) });
  });

  // GET /api/gatepasses
  // Students see their own passes; wardens see everyone's passes.
  router.get('/', requireRole('STUDENT', 'WARDEN'), (req, res) => {
    let rows;
    if (req.user.role === 'WARDEN') {
      rows = db.prepare('SELECT * FROM gate_passes ORDER BY id DESC').all();
    } else {
      rows = db.prepare('SELECT * FROM gate_passes WHERE studentId = ? ORDER BY id DESC').all(req.user.id);
    }
    res.json({ passes: rows.map(passWithStudent) });
  });

  // POST /api/gatepasses/:id/approve   (warden only)
  router.post('/:id/approve', requireRole('WARDEN'), (req, res) => {
    const pass = db.prepare('SELECT * FROM gate_passes WHERE id = ?').get(req.params.id);
    if (!pass) return res.status(404).json({ error: 'Gate pass not found.' });
    if (pass.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending passes can be approved.' });
    }

    // The QR code contains only this random token - never any personal data.
    const qrToken = 'GP-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    db.prepare("UPDATE gate_passes SET status = 'APPROVED', qrToken = ? WHERE id = ?").run(qrToken, pass.id);

    const updated = db.prepare('SELECT * FROM gate_passes WHERE id = ?').get(pass.id);
    res.json({ pass: passWithStudent(updated) });
  });

  // POST /api/gatepasses/:id/reject   (warden only)
  router.post('/:id/reject', requireRole('WARDEN'), (req, res) => {
    const pass = db.prepare('SELECT * FROM gate_passes WHERE id = ?').get(req.params.id);
    if (!pass) return res.status(404).json({ error: 'Gate pass not found.' });
    if (pass.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending passes can be rejected.' });
    }

    db.prepare("UPDATE gate_passes SET status = 'REJECTED' WHERE id = ?").run(pass.id);
    const updated = db.prepare('SELECT * FROM gate_passes WHERE id = ?').get(pass.id);
    res.json({ pass: passWithStudent(updated) });
  });

  // GET /api/gatepasses/:id/qr   (student only, own pass)
  // Returns the QR code as a PNG image the student can show at the gate.
  router.get('/:id/qr', requireRole('STUDENT'), (req, res) => {
    const pass = db.prepare('SELECT * FROM gate_passes WHERE id = ?').get(req.params.id);
    if (!pass || pass.studentId !== req.user.id) {
      return res.status(404).json({ error: 'Gate pass not found.' });
    }
    if (pass.status !== 'APPROVED' || !pass.qrToken) {
      return res.status(400).json({ error: 'This pass is not approved yet, so it has no QR code.' });
    }

    QRCode.toBuffer(pass.qrToken, { width: 320, margin: 2 }, (error, buffer) => {
      if (error) return res.status(500).json({ error: 'Could not create the QR code.' });
      res.setHeader('Content-Type', 'image/png');
      res.send(buffer);
    });
  });

  return router;
};

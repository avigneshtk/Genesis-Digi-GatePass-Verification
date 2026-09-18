import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { api, formatDateTime } from '../api';

export default function SecurityScanner() {
  const [tokenInput, setTokenInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [actionError, setActionError] = useState('');
  const [activity, setActivity] = useState([]);
  const [recordingAction, setRecordingAction] = useState(false);
  const [cameraActive, setCameraActive] = useState(true);

  const scannerRef = useRef(null);

  const loadActivity = async () => {
    try {
      const data = await api('/api/security/activity');
      setActivity(data.logs || []);
    } catch (err) {
      console.error('Failed to load activity:', err);
    }
  };

  useEffect(() => {
    loadActivity();
  }, []);

  const handleVerify = async (tokenToVerify) => {
    const cleanToken = (tokenToVerify || '').trim();
    if (!cleanToken) return;

    setVerifying(true);
    setActionError('');

    try {
      const data = await api(`/api/security/verify?token=${encodeURIComponent(cleanToken)}`);
      setVerificationResult(data);
    } catch (err) {
      setVerificationResult({ valid: false, reason: err.message });
    } finally {
      setVerifying(false);
    }
  };

  // Camera scanner effect
  useEffect(() => {
    if (!cameraActive) return;

    const qrElementId = 'qr-reader';
    let html5QrcodeScanner = null;

    try {
      html5QrcodeScanner = new Html5QrcodeScanner(
        qrElementId,
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      html5QrcodeScanner.render(
        (decodedText) => {
          setTokenInput(decodedText);
          handleVerify(decodedText);
        },
        (error) => {
          // ignore common background scanning frames
        }
      );

      scannerRef.current = html5QrcodeScanner;
    } catch (err) {
      console.warn('Camera scanner initialization error:', err);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch((e) => console.warn('Scanner clear error', e));
        scannerRef.current = null;
      }
    };
  }, [cameraActive]);

  const handleRecord = async (action) => {
    if (!verificationResult || !verificationResult.pass) return;

    setRecordingAction(true);
    setActionError('');

    try {
      const data = await api('/api/security/record', {
        method: 'POST',
        body: {
          gatePassId: verificationResult.pass.id,
          action: action,
        },
      });
      setVerificationResult(data);
      await loadActivity();
    } catch (err) {
      setActionError(err.message || `Failed to record ${action}`);
    } finally {
      setRecordingAction(false);
    }
  };

  return (
    <main className="container">
      <h2>Gate Pass Verification</h2>
      <div className="card">
        <p className="subtitle">
          Scan the student's QR code using the camera, or enter the token manually.
        </p>

        <div style={{ marginBottom: 16 }}>
          <button
            type="button"
            className="secondary"
            style={{ fontSize: '0.85rem', padding: '6px 14px' }}
            onClick={() => setCameraActive(!cameraActive)}
          >
            {cameraActive ? '📷 Hide Camera Scanner' : '📷 Open Camera Scanner'}
          </button>
        </div>

        {cameraActive && (
          <div
            id="qr-reader"
            style={{ width: '100%', maxWidth: 420, margin: '0 auto 20px', borderRadius: 12, overflow: 'hidden' }}
          ></div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerify(tokenInput);
          }}
        >
          <div className="form-group">
            <label htmlFor="token">Pass Token</label>
            <input
              id="token"
              type="text"
              placeholder="e.g. GP-8F42A91C"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={verifying}>
            {verifying ? 'Verifying...' : 'Check Pass'}
          </button>
        </form>

        {/* Verification Result Display */}
        {verificationResult && (
          <div className={`result-box ${verificationResult.valid ? 'valid' : 'invalid'}`}>
            {verificationResult.valid ? (
              <>
                <h3>✓ VALID PASS</h3>
                <p style={{ fontSize: '1.1rem', marginBottom: 6 }}>
                  <strong>{verificationResult.pass.studentName}</strong> ({verificationResult.pass.studentLoginId})
                  &nbsp;— Room {verificationResult.pass.roomNumber}
                </p>
                <p style={{ marginBottom: 4 }}>
                  <strong>Reason:</strong> {verificationResult.pass.reason}
                </p>
                <p style={{ marginBottom: 12 }}>
                  <strong>Valid Until:</strong> {formatDateTime(verificationResult.pass.toDateTime)}
                </p>

                {actionError && <p className="message error" style={{ marginBottom: 12 }}>{actionError}</p>}

                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    type="button"
                    style={{ flex: 1, backgroundColor: '#eab308', color: '#0f141d' }}
                    disabled={recordingAction}
                    onClick={() => handleRecord('EXIT')}
                  >
                    Record EXIT
                  </button>
                  <button
                    type="button"
                    style={{ flex: 1, backgroundColor: '#2f9e44', color: '#ffffff' }}
                    disabled={recordingAction}
                    onClick={() => handleRecord('ENTRY')}
                  >
                    Record ENTRY
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3>✕ INVALID PASS</h3>
                <p><strong>Reason:</strong> {verificationResult.reason}</p>
              </>
            )}
          </div>
        )}
      </div>

      <h2>Recent Gate Activity</h2>
      {activity.length === 0 ? (
        <p className="empty-note">No gate activity recorded yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Room</th>
                <th>Action</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {activity.map((log) => (
                <tr key={log.id}>
                  <td>{log.studentName}</td>
                  <td>{log.roomNumber || '-'}</td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: log.action === 'ENTRY' ? 'rgba(47, 158, 68, 0.25)' : 'rgba(234, 179, 8, 0.25)',
                        color: log.action === 'ENTRY' ? '#6ee7a0' : '#eab308',
                      }}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td>{formatDateTime(log.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

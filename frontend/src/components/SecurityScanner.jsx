import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { api, formatDateTime } from '../api';

export default function SecurityScanner() {
  const [tokenInput, setTokenInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [recordedResult, setRecordedResult] = useState(null);
  const [actionError, setActionError] = useState('');
  const [activity, setActivity] = useState([]);
  const [recordingAction, setRecordingAction] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [autoRecord, setAutoRecord] = useState(false);

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

  const handleRecord = async (gatePassId, action) => {
    setRecordingAction(true);
    setActionError('');
    try {
      const data = await api('/api/security/record', {
        method: 'POST',
        body: { gatePassId, action },
      });
      setRecordedResult(data);
      setVerificationResult(data);
      await loadActivity();
    } catch (err) {
      setActionError(err.message || `Failed to record ${action}`);
    } finally {
      setRecordingAction(false);
    }
  };

  const handleVerify = async (tokenToVerify) => {
    const cleanToken = (tokenToVerify || '').trim();
    if (!cleanToken) return;

    setVerifying(true);
    setActionError('');
    setRecordedResult(null);

    try {
      const data = await api(`/api/security/verify?token=${encodeURIComponent(cleanToken)}`);
      setVerificationResult(data);

      // If auto-record is enabled and pass is valid
      if (autoRecord && data.valid && data.nextAction && data.pass) {
        await handleRecord(data.pass.id, data.nextAction);
      }
    } catch (err) {
      setVerificationResult({ valid: false, reason: err.message || 'Verification error' });
    } finally {
      setVerifying(false);
    }
  };

  // Camera scanner lifecycle
  useEffect(() => {
    if (!cameraActive) {
      if (scannerRef.current) {
        scannerRef.current.clear().catch((e) => console.warn('Scanner clear error', e));
        scannerRef.current = null;
      }
      return;
    }

    setCameraError('');
    const qrElementId = 'qr-reader';
    let html5QrcodeScanner = null;

    try {
      html5QrcodeScanner = new Html5QrcodeScanner(
        qrElementId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          rememberLastUsedCamera: true,
          showTorchButtonIfSupported: true,
        },
        /* verbose= */ false
      );

      html5QrcodeScanner.render(
        (decodedText) => {
          setTokenInput(decodedText);
          handleVerify(decodedText);
        },
        (error) => {
          // Normal background frame scan
        }
      );

      scannerRef.current = html5QrcodeScanner;
    } catch (err) {
      console.warn('Camera scanner initialization error:', err);
      setCameraError('Camera access not supported or denied. Please use the manual token input below.');
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch((e) => console.warn('Scanner clear error', e));
        scannerRef.current = null;
      }
    };
  }, [cameraActive, autoRecord]);

  return (
    <main className="container">
      <h2>Gate Security Verification Portal</h2>
      <p className="subtitle">
        Scan the student's QR code at the gate or enter the pass token manually for two-stage Exit/Entry verification.
      </p>

      {/* Main Verification Card */}
      <div className="card">
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <button
            type="button"
            className={cameraActive ? 'secondary' : ''}
            style={{ margin: 0, padding: '8px 16px', fontSize: '0.88rem' }}
            onClick={() => {
              setCameraActive(!cameraActive);
              setCameraError('');
            }}
          >
            {cameraActive ? '📷 Close Camera Scanner' : '📷 Open Camera Scanner'}
          </button>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0, fontSize: '0.88rem', color: '#cbd5e1' }}>
            <input
              type="checkbox"
              style={{ width: 'auto', margin: 0 }}
              checked={autoRecord}
              onChange={(e) => setAutoRecord(e.target.checked)}
            />
            <span>⚡ Fast Mode: Auto-record on scan</span>
          </label>
        </div>

        {cameraError && (
          <div style={{ background: 'rgba(224,49,49,0.2)', border: '1px solid #e03131', padding: '10px 14px', borderRadius: 8, marginBottom: 16, color: '#fca5a5', fontSize: '0.88rem' }}>
            ⚠️ {cameraError}
          </div>
        )}

        {cameraActive && (
          <div
            id="qr-reader"
            style={{ width: '100%', maxWidth: 420, margin: '0 auto 20px', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}
          ></div>
        )}

        {/* Manual Token Verification Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerify(tokenInput);
          }}
        >
          <div className="form-group">
            <label htmlFor="token">Pass Token or QR Data</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="token"
                type="text"
                className="form-control"
                placeholder="e.g. GP-8F42A91C"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                style={{ flex: 1 }}
                required
              />
              <button
                type="submit"
                disabled={verifying}
                style={{ margin: 0, padding: '10px 20px', whiteSpace: 'nowrap' }}
              >
                {verifying ? 'Verifying...' : 'Check Pass'}
              </button>
            </div>
          </div>
        </form>

        {/* Action Error if any */}
        {actionError && (
          <div style={{ background: 'rgba(224,49,49,0.2)', border: '1px solid #e03131', padding: '10px 14px', borderRadius: 8, margin: '12px 0', color: '#fca5a5' }}>
            ✕ {actionError}
          </div>
        )}

        {/* Verification Result Display */}
        {verificationResult && (
          <div
            className={`result-box ${
              verificationResult.valid
                ? recordedResult
                  ? recordedResult.action === 'EXIT'
                    ? 'exit-success'
                    : 'entry-success'
                  : 'valid'
                : 'invalid'
            }`}
            style={{ marginTop: 20 }}
          >
            {verificationResult.valid ? (
              <>
                {/* Header Banner */}
                {recordedResult ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: '1.8rem' }}>🟢</span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.4rem', color: recordedResult.action === 'EXIT' ? '#eab308' : '#6ee7a0' }}>
                        {recordedResult.headline || (recordedResult.action === 'EXIT' ? 'OUT FROM GATE' : 'WELCOME TO HOSTEL')}
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#cbd5e1' }}>
                        {recordedResult.message}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: '1.6rem' }}>✓</span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.25rem' }}>
                        {verificationResult.headline || 'VALID GATE PASS'}
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1' }}>
                        {verificationResult.message}
                      </p>
                    </div>
                  </div>
                )}

                {/* Pass & Student Details */}
                <div
                  style={{
                    background: 'rgba(13, 17, 24, 0.65)',
                    padding: 14,
                    borderRadius: 10,
                    margin: '12px 0',
                    fontSize: '0.92rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                      {verificationResult.pass.studentName}
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span className={`badge ${verificationResult.pass.status}`}>
                        {verificationResult.pass.status}
                      </span>
                      {verificationResult.pass.type === 'EMERGENCY' && (
                        <span className="badge EMERGENCY">🚨 EMERGENCY</span>
                      )}
                    </div>
                  </div>

                  <div style={{ color: '#cbd5e1', marginBottom: 4 }}>
                    <strong>ID:</strong> {verificationResult.pass.studentLoginId} &bull; <strong>Room:</strong> {verificationResult.pass.roomNumber}
                  </div>

                  <div style={{ margin: '4px 0' }}>
                    <strong>Reason:</strong> {verificationResult.pass.reason}
                  </div>

                  {verificationResult.pass.destination && (
                    <div style={{ margin: '4px 0', color: '#fca5a5' }}>
                      📍 <strong>Destination:</strong> {verificationResult.pass.destination}
                    </div>
                  )}

                  {verificationResult.pass.description && (
                    <div style={{ margin: '4px 0', fontSize: '0.84rem', color: '#94a3b8', fontStyle: 'italic' }}>
                      Note: {verificationResult.pass.description}
                    </div>
                  )}

                  <div style={{ marginTop: 8, fontSize: '0.85rem', color: '#94a3b8' }}>
                    <strong>Valid Return Time:</strong> {formatDateTime(verificationResult.pass.toDateTime)}
                  </div>
                </div>

                {/* State-driven Action Buttons */}
                {!recordedResult && (
                  <div style={{ marginTop: 16 }}>
                    {verificationResult.pass.status === 'APPROVED' && (
                      <button
                        type="button"
                        style={{
                          width: '100%',
                          padding: '14px',
                          fontSize: '1.1rem',
                          backgroundColor: '#eab308',
                          color: '#0f141d',
                          fontWeight: 800,
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: 8,
                        }}
                        disabled={recordingAction}
                        onClick={() => handleRecord(verificationResult.pass.id, 'EXIT')}
                      >
                        {recordingAction ? 'Recording...' : '🚪 RECORD EXIT (OUT FROM GATE)'}
                      </button>
                    )}

                    {verificationResult.pass.status === 'OUT' && (
                      <button
                        type="button"
                        style={{
                          width: '100%',
                          padding: '14px',
                          fontSize: '1.1rem',
                          backgroundColor: '#2f9e44',
                          color: '#ffffff',
                          fontWeight: 800,
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: 8,
                        }}
                        disabled={recordingAction}
                        onClick={() => handleRecord(verificationResult.pass.id, 'ENTRY')}
                      >
                        {recordingAction ? 'Recording...' : '🏠 RECORD ENTRY (WELCOME TO HOSTEL)'}
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '2rem' }}>🔴</span>
                  <div>
                    <h3 style={{ margin: 0, color: '#fca5a5' }}>INVALID GATE PASS</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.95rem' }}>
                      <strong>Reason:</strong> {verificationResult.reason}
                    </p>
                  </div>
                </div>

                {verificationResult.pass && (
                  <div
                    style={{
                      background: 'rgba(13, 17, 24, 0.6)',
                      padding: 12,
                      borderRadius: 8,
                      marginTop: 12,
                      fontSize: '0.88rem',
                      color: '#cbd5e1',
                    }}
                  >
                    <div><strong>Student:</strong> {verificationResult.pass.studentName} ({verificationResult.pass.studentLoginId})</div>
                    <div><strong>Status:</strong> {verificationResult.pass.status}</div>
                    <div><strong>Valid until:</strong> {formatDateTime(verificationResult.pass.toDateTime)}</div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Recent Gate Activity Log */}
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
                <th>Pass Type</th>
                <th>Action</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {activity.map((log) => (
                <tr key={log.id}>
                  <td>
                    <strong>{log.studentName}</strong>
                  </td>
                  <td>{log.roomNumber || '-'}</td>
                  <td>
                    {log.passType === 'EMERGENCY' ? (
                      <span className="badge EMERGENCY" style={{ fontSize: '0.7rem' }}>🚨 EMERGENCY</span>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Normal</span>
                    )}
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        backgroundColor:
                          log.action === 'ENTRY' ? 'rgba(47, 158, 68, 0.25)' : 'rgba(234, 179, 8, 0.25)',
                        color: log.action === 'ENTRY' ? '#6ee7a0' : '#eab308',
                        fontWeight: 700,
                      }}
                    >
                      {log.action === 'ENTRY' ? '🟢 ENTRY' : '🚪 EXIT'}
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

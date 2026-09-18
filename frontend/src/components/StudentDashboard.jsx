import React, { useState, useEffect } from 'react';
import { api, getApiUrl, getSessionToken, formatDateTime } from '../api';

export default function StudentDashboard({ user }) {
  const [passes, setPasses] = useState([]);
  const [passType, setPassType] = useState('NORMAL'); // 'NORMAL' | 'EMERGENCY'
  const [reason, setReason] = useState('');
  const [destination, setDestination] = useState('');
  const [fromDateTime, setFromDateTime] = useState('');
  const [toDateTime, setToDateTime] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [activeQrPass, setActiveQrPass] = useState(null);

  const loadPasses = async () => {
    try {
      const data = await api('/api/gatepasses');
      setPasses(data.passes || []);
    } catch (err) {
      console.error('Failed to load passes:', err);
    }
  };

  useEffect(() => {
    loadPasses();
  }, []);

  // Quick fill helper for current datetime
  const getNowFormatted = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const handleApply = async (e) => {
    e.preventDefault();
    if (!reason || !fromDateTime || !toDateTime) {
      setMessage({ text: 'Please fill in reason, leave time, and return time.', type: 'error' });
      return;
    }

    if (passType === 'EMERGENCY' && !destination.trim()) {
      setMessage({ text: 'Please specify your emergency destination.', type: 'error' });
      return;
    }

    if (new Date(toDateTime) <= new Date(fromDateTime)) {
      setMessage({ text: 'Return time must be after leaving time.', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage({ text: 'Submitting gate pass request...', type: '' });

    try {
      await api('/api/gatepasses', {
        method: 'POST',
        body: {
          type: passType,
          reason,
          destination: passType === 'EMERGENCY' ? destination : '',
          fromDateTime,
          toDateTime,
          description: passType === 'EMERGENCY' ? description : '',
        },
      });
      setMessage({
        text: passType === 'EMERGENCY'
          ? '🚨 Emergency gate pass requested successfully! Warden has been notified.'
          : '✓ Gate pass requested successfully!',
        type: 'success',
      });
      setReason('');
      setDestination('');
      setFromDateTime('');
      setToDateTime('');
      setDescription('');
      await loadPasses();
    } catch (err) {
      setMessage({ text: err.message || 'Failed to submit gate pass.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQr = async (pass) => {
    try {
      const qrUrl = getApiUrl(
        `/api/gatepasses/${pass.id}/qr?token=${encodeURIComponent(getSessionToken() || '')}&download=1`
      );
      const response = await fetch(qrUrl);
      if (!response.ok) throw new Error('Failed to download QR');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `gatepass-${pass.qrToken || pass.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn('Download fallback to link:', err);
      window.open(
        getApiUrl(`/api/gatepasses/${pass.id}/qr?token=${encodeURIComponent(getSessionToken() || '')}&download=1`),
        '_blank'
      );
    }
  };

  // Helper to determine display status (accounting for real-time expiry)
  const getDisplayStatus = (pass) => {
    if (pass.status === 'APPROVED' && new Date(pass.toDateTime) < new Date()) {
      return 'EXPIRED';
    }
    return pass.status;
  };

  // Active pass available for QR presentation
  const activePass = passes.find(
    (p) => (p.status === 'APPROVED' || p.status === 'OUT') && new Date(p.toDateTime) >= new Date()
  );

  return (
    <main className="container">
      {/* Quick Active Pass Banner if available */}
      {activePass && (
        <div
          className="card"
          style={{
            border: '2px solid #2f9e44',
            background: 'rgba(47, 158, 68, 0.12)',
            marginBottom: 24,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className={`badge ${activePass.status}`}>{activePass.status}</span>
              {activePass.type === 'EMERGENCY' && <span className="badge EMERGENCY">🚨 EMERGENCY</span>}
              <strong style={{ color: '#6ee7a0' }}>Active Gate Pass #{activePass.id}</strong>
            </div>
            <p style={{ margin: '4px 0', fontSize: '0.95rem' }}>
              <strong>Reason:</strong> {activePass.reason} {activePass.destination && `(${activePass.destination})`}
            </p>
            <p style={{ fontSize: '0.85rem', color: '#cbd5e1', margin: 0 }}>
              Token: <span style={{ color: '#eab308', fontWeight: 700 }}>{activePass.qrToken}</span> &bull; Valid until: {formatDateTime(activePass.toDateTime)}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              style={{ margin: 0, padding: '8px 16px' }}
              onClick={() => setActiveQrPass(activePass)}
            >
              📱 Show QR Code
            </button>
            <button
              type="button"
              className="secondary"
              style={{ margin: 0, padding: '8px 14px' }}
              onClick={() => handleDownloadQr(activePass)}
            >
              📥 Download
            </button>
          </div>
        </div>
      )}

      {/* Application Form */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2>Apply for a Gate Pass</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={passType === 'NORMAL' ? '' : 'secondary'}
            style={{ margin: 0, padding: '6px 14px', fontSize: '0.88rem' }}
            onClick={() => {
              setPassType('NORMAL');
              setMessage({ text: '', type: '' });
            }}
          >
            📋 Normal Pass
          </button>
          <button
            type="button"
            className={passType === 'EMERGENCY' ? 'emergency-btn' : 'secondary'}
            style={{
              margin: 0,
              padding: '6px 14px',
              fontSize: '0.88rem',
              backgroundColor: passType === 'EMERGENCY' ? '#e03131' : undefined,
              color: '#ffffff',
            }}
            onClick={() => {
              setPassType('EMERGENCY');
              if (!fromDateTime) setFromDateTime(getNowFormatted());
              setMessage({ text: '', type: '' });
            }}
          >
            🚨 Emergency Pass
          </button>
        </div>
      </div>

      <div className={`card ${passType === 'EMERGENCY' ? 'emergency-card' : ''}`}>
        {passType === 'EMERGENCY' && (
          <div
            style={{
              background: 'rgba(224, 49, 49, 0.2)',
              borderLeft: '4px solid #e03131',
              padding: '10px 14px',
              borderRadius: 6,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <div>
              <strong style={{ color: '#fca5a5' }}>Emergency Gate Pass Mode</strong>
              <div style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                Emergency requests are highlighted immediately for Warden priority review. Provide destination and reason.
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleApply}>
          <div className="form-group">
            <label htmlFor="reason">
              {passType === 'EMERGENCY' ? '🚨 Reason for Emergency' : 'Reason for Leaving'}
            </label>
            <input
              id="reason"
              type="text"
              placeholder={passType === 'EMERGENCY' ? 'e.g. Medical emergency / Family urgent call' : 'e.g. Going home for the weekend'}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          {passType === 'EMERGENCY' && (
            <div className="form-group">
              <label htmlFor="destination">Destination / Hospital / Home Address</label>
              <input
                id="destination"
                type="text"
                placeholder="e.g. City Hospital, Sector 12 or Home in Pune"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-row">
            <div>
              <label htmlFor="fromDateTime">Leaving at</label>
              <input
                id="fromDateTime"
                type="datetime-local"
                value={fromDateTime}
                onChange={(e) => setFromDateTime(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="toDateTime">Returning at</label>
              <input
                id="toDateTime"
                type="datetime-local"
                value={toDateTime}
                onChange={(e) => setToDateTime(e.target.value)}
                required
              />
            </div>
          </div>

          {passType === 'EMERGENCY' && (
            <div className="form-group">
              <label htmlFor="description">Optional Additional Description / Contact Person</label>
              <textarea
                id="description"
                rows="2"
                placeholder="e.g. Accompanying person, parent contact number, or details"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: passType === 'EMERGENCY' ? '#e03131' : '#eab308',
              color: passType === 'EMERGENCY' ? '#ffffff' : '#0f141d',
            }}
          >
            {loading ? 'Submitting request...' : passType === 'EMERGENCY' ? '🚨 Submit Emergency Request' : 'Submit Request'}
          </button>

          {message.text && (
            <p className={`message ${message.type}`}>{message.text}</p>
          )}
        </form>
      </div>

      <h2>My Gate Passes</h2>
      {passes.length === 0 ? (
        <p className="empty-note">You haven't requested any gate passes yet.</p>
      ) : (
        <div className="pass-list">
          {passes.map((pass) => {
            const displayStatus = getDisplayStatus(pass);
            const isEmergency = pass.type === 'EMERGENCY';
            const isApproved = pass.status === 'APPROVED' || pass.status === 'OUT' || pass.status === 'RETURNED';

            return (
              <div
                key={pass.id}
                className={`pass-card ${isEmergency ? 'emergency-border' : ''}`}
              >
                <div className="pass-top">
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className={`badge ${displayStatus}`}>{displayStatus}</span>
                    {isEmergency && <span className="badge EMERGENCY">EMERGENCY</span>}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>#{pass.id}</span>
                </div>

                <div className="reason">{pass.reason}</div>
                {pass.destination && (
                  <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: 4 }}>
                    📍 <strong>Destination:</strong> {pass.destination}
                  </div>
                )}
                {pass.description && (
                  <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', marginBottom: 6 }}>
                    Note: {pass.description}
                  </div>
                )}

                <div className="times">
                  Leave: {formatDateTime(pass.fromDateTime)}
                  <br />
                  Return: {formatDateTime(pass.toDateTime)}
                </div>

                {pass.qrToken && (
                  <div className="times" style={{ color: '#eab308', fontWeight: 600 }}>
                    Token: {pass.qrToken}
                  </div>
                )}

                {isApproved && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button
                      type="button"
                      style={{ flex: 1 }}
                      onClick={() => setActiveQrPass(pass)}
                    >
                      Show QR
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      style={{ padding: '8px 12px' }}
                      title="Download QR Code"
                      onClick={() => handleDownloadQr(pass)}
                    >
                      📥
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* QR Code Modal */}
      {activeQrPass && (
        <div className="modal-overlay" onClick={() => setActiveQrPass(null)}>
          <div
            className="card qr-holder"
            style={{ maxWidth: 440, width: '100%', position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span className={`badge ${getDisplayStatus(activeQrPass)}`}>
                  {getDisplayStatus(activeQrPass)}
                </span>
                {activeQrPass.type === 'EMERGENCY' && <span className="badge EMERGENCY">🚨 EMERGENCY</span>}
              </div>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Pass #{activeQrPass.id}</span>
            </div>

            <h3 style={{ margin: '4px 0' }}>Approved Gate Pass</h3>
            <p className="subtitle" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#eab308', letterSpacing: '0.05em', margin: '4px 0 10px' }}>
              {activeQrPass.qrToken}
            </p>

            <img
              src={getApiUrl(`/api/gatepasses/${activeQrPass.id}/qr?token=${encodeURIComponent(getSessionToken() || '')}`)}
              alt="Gate pass QR code"
              style={{ width: 250, height: 250, margin: '0 auto 12px', display: 'block', background: '#ffffff' }}
            />

            <div style={{ textAlign: 'left', background: 'rgba(13, 17, 24, 0.6)', padding: '12px', borderRadius: 8, marginBottom: 16, fontSize: '0.88rem' }}>
              <div><strong>Student:</strong> {user ? user.name : 'Rahul'} ({user ? user.loginId : '-'})</div>
              <div><strong>Room:</strong> {user ? user.roomNumber : '-'}</div>
              <div><strong>Reason:</strong> {activeQrPass.reason}</div>
              {activeQrPass.destination && <div><strong>Destination:</strong> {activeQrPass.destination}</div>}
              <div style={{ color: '#cbd5e1', marginTop: 4 }}>
                <strong>Valid until:</strong> {formatDateTime(activeQrPass.toDateTime)}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                style={{ flex: 1, backgroundColor: '#2f9e44', color: '#ffffff' }}
                onClick={() => handleDownloadQr(activeQrPass)}
              >
                📥 Download QR Code
              </button>
              <button
                className="secondary"
                style={{ flex: 1 }}
                onClick={() => setActiveQrPass(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

import React, { useState, useEffect } from 'react';
import { api, getApiUrl, getSessionToken, formatDateTime } from '../api';

export default function StudentDashboard({ user }) {
  const [passes, setPasses] = useState([]);
  const [reason, setReason] = useState('');
  const [fromDateTime, setFromDateTime] = useState('');
  const [toDateTime, setToDateTime] = useState('');
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

  const handleApply = async (e) => {
    e.preventDefault();
    if (!reason || !fromDateTime || !toDateTime) {
      setMessage({ text: 'Please fill in reason, leave time, and return time.', type: 'error' });
      return;
    }

    if (new Date(toDateTime) <= new Date(fromDateTime)) {
      setMessage({ text: 'Return time must be after leaving time.', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage({ text: 'Submitting request...', type: '' });

    try {
      await api('/api/gatepasses', {
        method: 'POST',
        body: { reason, fromDateTime, toDateTime },
      });
      setMessage({ text: '✓ Gate pass requested successfully!', type: 'success' });
      setReason('');
      setFromDateTime('');
      setToDateTime('');
      await loadPasses();
    } catch (err) {
      setMessage({ text: err.message || 'Failed to submit gate pass.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container">
      <h2>Apply for a Gate Pass</h2>
      <div className="card">
        <form onSubmit={handleApply}>
          <div className="form-group">
            <label htmlFor="reason">Reason for Leaving</label>
            <input
              id="reason"
              type="text"
              placeholder="e.g. Going home for the weekend"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

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

          <button type="submit" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Request'}
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
          {passes.map((pass) => (
            <div key={pass.id} className="pass-card">
              <div className="pass-top">
                <span className={`badge ${pass.status}`}>{pass.status}</span>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>#{pass.id}</span>
              </div>
              <div className="reason">{pass.reason}</div>
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
              {pass.status === 'APPROVED' && (
                <button
                  type="button"
                  style={{ width: '100%', marginTop: 8 }}
                  onClick={() => setActiveQrPass(pass)}
                >
                  Show QR Code
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* QR Code Modal */}
      {activeQrPass && (
        <div className="modal-overlay" onClick={() => setActiveQrPass(null)}>
          <div
            className="card qr-holder"
            style={{ maxWidth: 420, width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Show this at the gate</h3>
            <p className="subtitle" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#eab308' }}>
              {activeQrPass.qrToken}
            </p>
            <img
              src={getApiUrl(`/api/gatepasses/${activeQrPass.id}/qr?token=${encodeURIComponent(getSessionToken() || '')}`)}
              alt="Gate pass QR code"
              style={{ width: 260, height: 260 }}
            />
            <p className="subtitle">
              Valid until {formatDateTime(activeQrPass.toDateTime)}
            </p>
            <button
              className="secondary"
              style={{ width: '100%' }}
              onClick={() => setActiveQrPass(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

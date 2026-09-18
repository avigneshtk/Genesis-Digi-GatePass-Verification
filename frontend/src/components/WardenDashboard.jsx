import React, { useState, useEffect } from 'react';
import { api, formatDateTime } from '../api';

export default function WardenDashboard() {
  const [passes, setPasses] = useState([]);
  const [activity, setActivity] = useState([]);
  const [processingId, setProcessingId] = useState(null);
  const [filter, setFilter] = useState('PENDING'); // 'PENDING' | 'EMERGENCY' | 'ALL' | 'APPROVED' | 'REJECTED'
  const [showAcceptAllModal, setShowAcceptAllModal] = useState(false);
  const [acceptAllLoading, setAcceptAllLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState({ text: '', type: '' });

  const loadData = async () => {
    try {
      const [passData, activityData] = await Promise.all([
        api('/api/gatepasses'),
        api('/api/security/activity'),
      ]);
      setPasses(passData.passes || []);
      setActivity(activityData.logs || []);
    } catch (err) {
      console.error('Error loading warden data:', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // refresh periodically
    return () => clearInterval(interval);
  }, []);

  const handleDecision = async (passId, decision) => {
    setProcessingId(passId);
    setActionFeedback({ text: '', type: '' });
    try {
      await api(`/api/gatepasses/${passId}/${decision}`, { method: 'POST' });
      setActionFeedback({
        text: `Pass #${passId} was ${decision === 'approve' ? 'approved' : 'rejected'} successfully.`,
        type: 'success',
      });
      await loadData();
    } catch (err) {
      setActionFeedback({ text: err.message || `Failed to ${decision} pass.`, type: 'error' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleAcceptAll = async () => {
    setAcceptAllLoading(true);
    try {
      const res = await api('/api/gatepasses/approve-all', { method: 'POST' });
      setShowAcceptAllModal(false);
      setActionFeedback({
        text: res.message || `Approved all pending gate passes.`,
        type: 'success',
      });
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to approve all requests.');
    } finally {
      setAcceptAllLoading(false);
    }
  };

  // Helper to determine display status
  const getDisplayStatus = (pass) => {
    if (pass.status === 'APPROVED' && new Date(pass.toDateTime) < new Date()) {
      return 'EXPIRED';
    }
    return pass.status;
  };

  const pendingPasses = passes.filter((p) => p.status === 'PENDING');
  const emergencyPasses = passes.filter((p) => p.type === 'EMERGENCY');
  const pendingEmergencyCount = passes.filter((p) => p.type === 'EMERGENCY' && p.status === 'PENDING').length;
  const approvedPasses = passes.filter((p) => p.status === 'APPROVED' || p.status === 'OUT' || p.status === 'RETURNED');
  const rejectedPasses = passes.filter((p) => p.status === 'REJECTED');

  // Filtered passes based on active tab
  const getFilteredPasses = () => {
    switch (filter) {
      case 'PENDING':
        return pendingPasses;
      case 'EMERGENCY':
        return emergencyPasses;
      case 'APPROVED':
        return approvedPasses;
      case 'REJECTED':
        return rejectedPasses;
      default:
        return passes;
    }
  };

  const displayedPasses = getFilteredPasses();

  return (
    <main className="container">
      {/* Top Header & Bulk Action Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <h2>Warden Control Dashboard</h2>
          <p className="subtitle" style={{ margin: 0 }}>
            Manage Digital GatePass approvals, emergency alerts, and gate flow.
          </p>
        </div>

        {pendingPasses.length > 0 && (
          <button
            type="button"
            className="approve"
            style={{ margin: 0, padding: '10px 18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => setShowAcceptAllModal(true)}
          >
            ✓ ACCEPT ALL ({pendingPasses.length})
          </button>
        )}
      </div>

      {actionFeedback.text && (
        <p className={`message ${actionFeedback.type}`} style={{ marginBottom: 16 }}>
          {actionFeedback.text}
        </p>
      )}

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 20,
          background: 'rgba(13, 17, 24, 0.6)',
          padding: 6,
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <button
          type="button"
          className={`role-tab ${filter === 'PENDING' ? 'active' : ''}`}
          style={{ flex: '1 1 auto', margin: 0, padding: '8px 12px' }}
          onClick={() => setFilter('PENDING')}
        >
          ⏳ Pending ({pendingPasses.length})
        </button>
        <button
          type="button"
          className={`role-tab ${filter === 'EMERGENCY' ? 'active' : ''}`}
          style={{
            flex: '1 1 auto',
            margin: 0,
            padding: '8px 12px',
            color: pendingEmergencyCount > 0 && filter !== 'EMERGENCY' ? '#fca5a5' : undefined,
          }}
          onClick={() => setFilter('EMERGENCY')}
        >
          🚨 Emergency ({emergencyPasses.length})
          {pendingEmergencyCount > 0 && (
            <span
              style={{
                marginLeft: 6,
                background: '#e03131',
                color: '#fff',
                borderRadius: '50%',
                padding: '1px 6px',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              {pendingEmergencyCount}
            </span>
          )}
        </button>
        <button
          type="button"
          className={`role-tab ${filter === 'APPROVED' ? 'active' : ''}`}
          style={{ flex: '1 1 auto', margin: 0, padding: '8px 12px' }}
          onClick={() => setFilter('APPROVED')}
        >
          ✓ Approved ({approvedPasses.length})
        </button>
        <button
          type="button"
          className={`role-tab ${filter === 'REJECTED' ? 'active' : ''}`}
          style={{ flex: '1 1 auto', margin: 0, padding: '8px 12px' }}
          onClick={() => setFilter('REJECTED')}
        >
          ✕ Rejected ({rejectedPasses.length})
        </button>
        <button
          type="button"
          className={`role-tab ${filter === 'ALL' ? 'active' : ''}`}
          style={{ flex: '1 1 auto', margin: 0, padding: '8px 12px' }}
          onClick={() => setFilter('ALL')}
        >
          All Passes ({passes.length})
        </button>
      </div>

      {/* Passes Grid */}
      {displayedPasses.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '36px 20px' }}>
          <p className="empty-note" style={{ fontSize: '1rem' }}>
            No requests found in this category. 🎉
          </p>
        </div>
      ) : (
        <div className="pass-list">
          {displayedPasses.map((pass) => {
            const isEmergency = pass.type === 'EMERGENCY';
            const displayStatus = getDisplayStatus(pass);
            const isPending = pass.status === 'PENDING';

            return (
              <div
                key={pass.id}
                className={`pass-card ${isEmergency ? 'emergency-border' : ''}`}
              >
                <div className="pass-top">
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className={`badge ${displayStatus}`}>{displayStatus}</span>
                    {isEmergency && <span className="badge EMERGENCY">🚨 EMERGENCY</span>}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>#{pass.id}</span>
                </div>

                <div className="reason" style={{ fontSize: '1.05rem', color: '#ffffff' }}>
                  {pass.studentName} ({pass.studentLoginId})
                </div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 8 }}>
                  Room: <strong>{pass.roomNumber || '-'}</strong>
                </div>

                <div style={{ margin: '6px 0', fontSize: '0.95rem' }}>
                  <strong>Reason:</strong> {pass.reason}
                </div>

                {pass.destination && (
                  <div style={{ margin: '4px 0', fontSize: '0.88rem', color: '#cbd5e1' }}>
                    📍 <strong>Destination:</strong> {pass.destination}
                  </div>
                )}

                {pass.description && (
                  <div style={{ margin: '4px 0', fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic' }}>
                    Details: {pass.description}
                  </div>
                )}

                <div className="times" style={{ marginTop: 8 }}>
                  Leave: {formatDateTime(pass.fromDateTime)}
                  <br />
                  Return: {formatDateTime(pass.toDateTime)}
                </div>

                {pass.qrToken && (
                  <div style={{ fontSize: '0.82rem', color: '#eab308', fontWeight: 600, marginBottom: 8 }}>
                    Token: {pass.qrToken}
                  </div>
                )}

                {isPending && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                      className="approve"
                      style={{ flex: 1 }}
                      disabled={processingId === pass.id}
                      onClick={() => handleDecision(pass.id, 'approve')}
                    >
                      {processingId === pass.id ? '...' : 'Approve'}
                    </button>
                    <button
                      className="reject"
                      style={{ flex: 1 }}
                      disabled={processingId === pass.id}
                      onClick={() => handleDecision(pass.id, 'reject')}
                    >
                      {processingId === pass.id ? '...' : 'Reject'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Recent Gate Activity */}
      <h2>Recent Gate Activity</h2>
      {activity.length === 0 ? (
        <p className="empty-note">No gate entries or exits recorded yet.</p>
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
                  <td>{log.studentName}</td>
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

      {/* Confirmation Modal for Accept All */}
      {showAcceptAllModal && (
        <div className="modal-overlay" onClick={() => setShowAcceptAllModal(false)}>
          <div
            className="card"
            style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚠️</div>
            <h3 style={{ color: '#eab308', marginBottom: 12 }}>Confirm Bulk Approval</h3>
            <p style={{ fontSize: '0.95rem', marginBottom: 12 }}>
              Are you sure you want to approve all <strong>{pendingPasses.length}</strong> pending gate pass requests?
            </p>
            {pendingEmergencyCount > 0 && (
              <div
                style={{
                  background: 'rgba(224, 49, 49, 0.2)',
                  border: '1px solid #e03131',
                  borderRadius: 6,
                  padding: '8px 12px',
                  marginBottom: 16,
                  color: '#fca5a5',
                  fontSize: '0.85rem',
                }}
              >
                🚨 Notice: This includes <strong>{pendingEmergencyCount}</strong> Emergency gate pass request(s).
              </div>
            )}
            <p className="subtitle" style={{ fontSize: '0.82rem', marginBottom: 20 }}>
              Unique QR tokens will be generated for each student immediately.
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="approve"
                style={{ flex: 1 }}
                disabled={acceptAllLoading}
                onClick={handleAcceptAll}
              >
                {acceptAllLoading ? 'Approving All...' : 'Yes, Approve All'}
              </button>
              <button
                type="button"
                className="secondary"
                style={{ flex: 1 }}
                disabled={acceptAllLoading}
                onClick={() => setShowAcceptAllModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

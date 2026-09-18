import React, { useState, useEffect } from 'react';
import { api, formatDateTime } from '../api';

export default function WardenDashboard() {
  const [passes, setPasses] = useState([]);
  const [activity, setActivity] = useState([]);
  const [processingId, setProcessingId] = useState(null);

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
    try {
      await api(`/api/gatepasses/${passId}/${decision}`, { method: 'POST' });
      await loadData();
    } catch (err) {
      alert(err.message || `Failed to ${decision} pass.`);
    } finally {
      setProcessingId(null);
    }
  };

  const pendingPasses = passes.filter((p) => p.status === 'PENDING');

  return (
    <main className="container">
      <h2>Pending Requests ({pendingPasses.length})</h2>
      {pendingPasses.length === 0 ? (
        <p className="empty-note">No pending requests right now. 🎉</p>
      ) : (
        <div className="pass-list">
          {pendingPasses.map((pass) => (
            <div key={pass.id} className="pass-card">
              <div className="pass-top">
                <span className="badge PENDING">PENDING</span>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>#{pass.id}</span>
              </div>
              <div className="reason">
                {pass.studentName} ({pass.studentLoginId}) — Room {pass.roomNumber}
              </div>
              <div style={{ margin: '6px 0', fontSize: '0.95rem' }}>{pass.reason}</div>
              <div className="times">
                Leave: {formatDateTime(pass.fromDateTime)}
                <br />
                Return: {formatDateTime(pass.toDateTime)}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                  className="approve"
                  style={{ flex: 1 }}
                  disabled={processingId === pass.id}
                  onClick={() => handleDecision(pass.id, 'approve')}
                >
                  Approve
                </button>
                <button
                  className="reject"
                  style={{ flex: 1 }}
                  disabled={processingId === pass.id}
                  onClick={() => handleDecision(pass.id, 'reject')}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2>All Gate Passes</h2>
      {passes.length === 0 ? (
        <p className="empty-note">No gate passes in the system yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Room</th>
                <th>Reason</th>
                <th>Leave</th>
                <th>Return</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {passes.map((pass) => (
                <tr key={pass.id}>
                  <td>
                    <strong>{pass.studentName}</strong>
                    <br />
                    <small style={{ color: '#94a3b8' }}>{pass.studentLoginId}</small>
                  </td>
                  <td>{pass.roomNumber || '-'}</td>
                  <td>{pass.reason}</td>
                  <td>{formatDateTime(pass.fromDateTime)}</td>
                  <td>{formatDateTime(pass.toDateTime)}</td>
                  <td>
                    <span className={`badge ${pass.status}`}>{pass.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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

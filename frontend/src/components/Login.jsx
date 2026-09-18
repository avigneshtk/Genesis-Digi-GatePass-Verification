import React, { useState } from 'react';
import { api } from '../api';

const demoAccounts = [
  { label: '👨‍🎓 Student (STU001)', id: 'STU001', pass: 'student123' },
  { label: '👨‍🏫 Warden (WARDEN01)', id: 'WARDEN01', pass: 'warden123' },
  { label: '🛡️ Security (SEC01)', id: 'SEC01', pass: 'security123' },
];

export default function Login({ onLoginSuccess }) {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleQuickFill = (id, pass) => {
    setLoginId(id);
    setPassword(pass);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!loginId.trim() || !password) {
      setError('Please enter your Username / ID and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: { loginId: loginId.trim(), password },
      });
      // The backend response determines the role (STUDENT / WARDEN / SECURITY)
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-container">
      <div className="bg-overlay"></div>

      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 6 }}>🏠</div>
          <h1 className="card-title" style={{ marginBottom: 4 }}>DIGITAL GATEPASS</h1>
          <p className="subtitle" style={{ fontSize: '0.88rem', margin: 0 }}>
            Unified Digital GatePass Verification Portal
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="loginId">Username / ID</label>
            <input
              id="loginId"
              type="text"
              className="form-control"
              placeholder="e.g. STU001, WARDEN01, or SEC01"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-control"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Verifying credentials...' : 'LOGIN'}
          </button>

          {error && <p className="message error">{error}</p>}
        </form>

        <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 10, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Quick Demo Logins
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {demoAccounts.map((acc) => (
              <button
                key={acc.id}
                type="button"
                className="secondary"
                style={{
                  fontSize: '0.82rem',
                  padding: '7px 12px',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 0,
                }}
                onClick={() => handleQuickFill(acc.id, acc.pass)}
              >
                <span>{acc.label}</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Fill</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

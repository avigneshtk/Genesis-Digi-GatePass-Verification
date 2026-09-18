import React, { useState } from 'react';
import { api, getApiBaseUrl } from '../api';

const roleDefaults = {
  student: {
    label: 'Student Registration No / ID',
    placeholder: 'e.g. STU001',
    loginId: 'STU001',
    password: 'student123',
    buttonText: 'Login as Student',
  },
  warden: {
    label: 'Warden Employee ID',
    placeholder: 'e.g. WARDEN01',
    loginId: 'WARDEN01',
    password: 'warden123',
    buttonText: 'Login as Warden',
  },
  security: {
    label: 'Gate Security ID',
    placeholder: 'e.g. SEC01',
    loginId: 'SEC01',
    password: 'security123',
    buttonText: 'Login as Security',
  },
};

export default function Login({ onLoginSuccess, onOpenConfig }) {
  const [role, setRole] = useState('student');
  const [loginId, setLoginId] = useState(roleDefaults.student.loginId);
  const [password, setPassword] = useState(roleDefaults.student.password);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentRoleConfig = roleDefaults[role];

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setLoginId(roleDefaults[newRole].loginId);
    setPassword(roleDefaults[newRole].password);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!loginId || !password) {
      setError('Please enter your ID and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: { loginId, password },
      });
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const apiBase = getApiBaseUrl();

  return (
    <div className="main-container">
      <div className="bg-overlay"></div>

      <div className="login-card">
        <h1 className="card-title">Digital Gate Pass</h1>

        <div className="role-tabs">
          <button
            type="button"
            className={`role-tab ${role === 'student' ? 'active' : ''}`}
            onClick={() => handleRoleChange('student')}
          >
            Student
          </button>
          <button
            type="button"
            className={`role-tab ${role === 'warden' ? 'active' : ''}`}
            onClick={() => handleRoleChange('warden')}
          >
            Warden
          </button>
          <button
            type="button"
            className={`role-tab ${role === 'security' ? 'active' : ''}`}
            onClick={() => handleRoleChange('security')}
          >
            Security
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="loginId">{currentRoleConfig.label}</label>
            <input
              id="loginId"
              type="text"
              className="form-control"
              placeholder={currentRoleConfig.placeholder}
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
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
              required
            />
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Logging in...' : currentRoleConfig.buttonText}
          </button>

          {error && <p className="message error">{error}</p>}
        </form>

        <div className="card-footer">
          <div>
            Demo logins: STU001 / student123 &bull; WARDEN01 / warden123 &bull; SEC01 / security123
          </div>
          <div style={{ marginTop: 12, fontSize: '0.8rem', opacity: 0.8 }}>
            API: {apiBase ? apiBase : 'Local / Proxy'} &bull;{' '}
            <a href="#configure" onClick={(e) => { e.preventDefault(); onOpenConfig(); }}>
              Configure Backend
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

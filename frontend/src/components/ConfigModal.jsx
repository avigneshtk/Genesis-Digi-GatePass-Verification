import React, { useState } from 'react';
import { getApiBaseUrl, setApiBaseUrl, api } from '../api';

export default function ConfigModal({ onClose }) {
  const [url, setUrl] = useState(getApiBaseUrl());
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    // Temporarily set URL to test
    const oldUrl = getApiBaseUrl();
    setApiBaseUrl(url);

    try {
      const res = await api('/health');
      setTestResult({ success: true, message: `Connected! Database: ${res.database}` });
    } catch (err) {
      setTestResult({ success: false, message: `Connection failed: ${err.message}` });
    } finally {
      // restore old url until saved
      setApiBaseUrl(oldUrl);
      setTesting(false);
    }
  };

  const handleSave = () => {
    setApiBaseUrl(url);
    window.location.reload();
  };

  const handleReset = () => {
    setApiBaseUrl('');
    window.location.reload();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="card"
        style={{ maxWidth: 460, width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginBottom: 12, color: '#eab308' }}>Backend API Settings</h3>
        <p className="subtitle" style={{ fontSize: '0.9rem' }}>
          Specify your backend URL if hosted separately (e.g. Render / Railway).
          Leave empty for same-origin proxy (Vercel rewrites or local monolith).
        </p>

        <div className="form-group">
          <label htmlFor="apiUrlInput">Backend Base URL</label>
          <input
            id="apiUrlInput"
            type="text"
            placeholder="e.g. https://genesis-api.onrender.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            className="secondary"
            style={{ flex: 1 }}
            disabled={testing}
            onClick={handleTest}
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          <button
            type="button"
            className="secondary"
            style={{ flex: 1 }}
            onClick={handleReset}
          >
            Reset to Default
          </button>
        </div>

        {testResult && (
          <p
            className={`message ${testResult.success ? 'success' : 'error'}`}
            style={{ marginBottom: 16 }}
          >
            {testResult.message}
          </p>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" style={{ flex: 1 }} onClick={handleSave}>
            Save & Apply
          </button>
          <button type="button" className="secondary" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

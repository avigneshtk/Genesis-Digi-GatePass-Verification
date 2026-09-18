import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Login from './components/Login';
import StudentDashboard from './components/StudentDashboard';
import WardenDashboard from './components/WardenDashboard';
import SecurityScanner from './components/SecurityScanner';
import ConfigModal from './components/ConfigModal';
import { api, setSessionToken } from './api';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await api('/api/auth/me');
        setUser(data.user);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.warn('Logout error:', err);
    } finally {
      setSessionToken(null);
      setUser(null);
    }
  };

  if (loading) {
    return (
      <div className="main-container">
        <p className="subtitle" style={{ fontSize: '1.2rem', color: '#eab308' }}>
          Loading Digital GatePass...
        </p>
      </div>
    );
  }

  return (
    <>
      <Navbar
        user={user}
        onLogout={handleLogout}
        onOpenConfig={() => setShowConfig(true)}
      />

      {!user && (
        <Login
          onLoginSuccess={(loggedInUser) => setUser(loggedInUser)}
          onOpenConfig={() => setShowConfig(true)}
        />
      )}

      {user && user.role === 'STUDENT' && <StudentDashboard user={user} />}
      {user && user.role === 'WARDEN' && <WardenDashboard />}
      {user && user.role === 'SECURITY' && <SecurityScanner />}

      <footer className="footer">
        Digital Gate Pass Verification System &bull; Hackathon Edition
      </footer>

      {showConfig && <ConfigModal onClose={() => setShowConfig(false)} />}
    </>
  );
}

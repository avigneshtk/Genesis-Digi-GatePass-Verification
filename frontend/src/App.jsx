import React, { useState, useEffect, lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import Login from './components/Login';
import { api, setSessionToken, getCurrentUser, setCurrentUser } from './api';

const StudentDashboard = lazy(() => import('./components/StudentDashboard'));
const WardenDashboard = lazy(() => import('./components/WardenDashboard'));
const SecurityScanner = lazy(() => import('./components/SecurityScanner'));

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let isMounted = true;
    getCurrentUser().then((userData) => {
      if (isMounted && userData) {
        setUser(userData);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.warn('Logout error:', err);
    } finally {
      setSessionToken(null);
      setCurrentUser(null);
      setUser(null);
    }
  };

  const handleLoginSuccess = (loggedInUser) => {
    setCurrentUser(loggedInUser);
    setUser(loggedInUser);
  };

  return (
    <>
      <Navbar user={user} onLogout={handleLogout} />

      {!user && <Login onLoginSuccess={handleLoginSuccess} />}

      <Suspense
        fallback={
          <div className="main-container">
            <p className="subtitle" style={{ fontSize: '1.2rem', color: '#eab308' }}>
              Loading Dashboard...
            </p>
          </div>
        }
      >
        {user && user.role === 'STUDENT' && <StudentDashboard user={user} />}
        {user && user.role === 'WARDEN' && <WardenDashboard user={user} />}
        {user && user.role === 'SECURITY' && <SecurityScanner user={user} />}
      </Suspense>

      <footer className="footer">
        Digital GatePass Verification System &bull; Hackathon Edition
      </footer>
    </>
  );
}

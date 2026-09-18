import React from 'react';

export default function Navbar({ user, onLogout, onOpenConfig }) {
  return (
    <header className="topbar">
      <div className="brand-logo">
        🏠 Genesis <span>GatePass</span>
      </div>

      <div className="user-chip">
        {user ? (
          <>
            <span>
              <strong>{user.name}</strong> ({user.loginId})
              <span className={`badge ${user.role}`} style={{ marginLeft: 8 }}>
                {user.role}
              </span>
            </span>
            <button className="logout-button" onClick={onLogout}>
              Log out
            </button>
          </>
        ) : (
          <button
            className="logout-button"
            style={{ fontSize: '0.8rem', padding: '4px 10px' }}
            onClick={onOpenConfig}
          >
            ⚙️ API Settings
          </button>
        )}
      </div>
    </header>
  );
}

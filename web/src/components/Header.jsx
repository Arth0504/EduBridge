import React, { useState, useEffect } from 'react';
import { Server, User, LogOut } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const [backendStatus, setBackendStatus] = useState('Checking...');
  const { user, logout } = useAuth();

  useEffect(() => {
    axios
      .get('http://localhost:5000/api/health')
      .then((res) => {
        if (res.data && res.data.success) {
          setBackendStatus('Operational');
        } else {
          setBackendStatus('Degraded');
        }
      })
      .catch(() => {
        setBackendStatus('Offline');
      });
  }, []);

  return (
    <header className="top-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Administration Console</h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div className="status-indicator">
          <span className="dot" style={{ backgroundColor: backendStatus === 'Operational' ? '#10b981' : '#f59e0b' }}></span>
          <Server size={14} />
          <span>API: {backendStatus}</span>
        </div>

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                {user.fullName}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 600, textTransform: 'uppercase' }}>
                {user.role}
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Guest Session
          </div>
        )}
      </div>
    </header>
  );
}

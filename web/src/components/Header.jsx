import React, { useState, useEffect } from 'react';
import { Server, Activity } from 'lucide-react';
import axios from 'axios';

export default function Header() {
  const [backendStatus, setBackendStatus] = useState('Checking...');

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
        setBackendStatus('Offline (Start Backend)');
      });
  }, []);

  return (
    <header className="top-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Administration Console</h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div className="status-indicator">
          <span className="dot" style={{ backgroundColor: backendStatus === 'Operational' ? '#10b981' : '#f59e0b' }}></span>
          <Server size={14} />
          <span>Backend API: {backendStatus}</span>
        </div>
        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
          Role: <strong style={{ color: '#ffffff' }}>SuperAdmin</strong>
        </div>
      </div>
    </header>
  );
}

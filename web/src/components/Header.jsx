import React, { useState, useEffect, useRef } from 'react';
import { Server, User, LogOut, Bell, CheckCheck, X } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:5000/api/v1';

export default function Header() {
  const [backendStatus, setBackendStatus] = useState('Checking...');
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifs, setRecentNotifs] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState(null);

  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

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

  const fetchUnreadAndRecent = async () => {
    if (!token || !user) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_BASE}/notifications?limit=5`, { headers });
      if (res.data && res.data.success) {
        setRecentNotifs(res.data.data.notifications || []);
        setUnreadCount(res.data.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch header notifications:', err);
    }
  };

  useEffect(() => {
    fetchUnreadAndRecent();
    const interval = setInterval(fetchUnreadAndRecent, 30000); // Polling every 30s
    return () => clearInterval(interval);
  }, [token, user]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.patch(`${API_BASE}/notifications/read-all`, {}, { headers });
      setUnreadCount(0);
      setRecentNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleItemClick = async (notif) => {
    setSelectedNotif(notif);
    setIsDropdownOpen(false);
    if (!notif.isRead) {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        await axios.patch(`${API_BASE}/notifications/${notif._id}/read`, {}, { headers });
        setUnreadCount(prev => Math.max(0, prev - 1));
        setRecentNotifs(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
      } catch (err) {
        console.error('Error marking single as read:', err);
      }
    }
  };

  return (
    <header className="top-navbar" style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#ffffff', margin: 0 }}>Administration Console</h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div className="status-indicator">
          <span className="dot" style={{ backgroundColor: backendStatus === 'Operational' ? '#10b981' : '#f59e0b' }}></span>
          <Server size={14} />
          <span>API: {backendStatus}</span>
        </div>

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            
            {/* Notification Bell Dropdown */}
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  setIsDropdownOpen(!isDropdownOpen);
                  if (!isDropdownOpen) fetchUnreadAndRecent();
                }}
                title="Notifications"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-5px',
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '10px',
                    lineHeight: 1
                  }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Menu */}
              {isDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '48px',
                  width: '360px',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
                  border: '1px solid #e2e8f0',
                  zIndex: 999,
                  overflow: 'hidden',
                  color: '#0f172a'
                }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                      Notifications {unreadCount > 0 && <span style={{ color: '#4f46e5' }}>({unreadCount} unread)</span>}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        style={{ border: 'none', background: 'none', color: '#4f46e5', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <CheckCheck size={14} /> Mark all read
                      </button>
                    )}
                  </div>

                  <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                    {recentNotifs.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                        No notifications yet.
                      </div>
                    ) : (
                      recentNotifs.map((n) => (
                        <div
                          key={n._id}
                          onClick={() => handleItemClick(n)}
                          style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: !n.isRead ? '#eef2ff' : '#ffffff',
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4338ca', textTransform: 'uppercase' }}>
                              {n.type}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                              {new Date(n.publishedAt || n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>
                            {n.title}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {n.message}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div
                    onClick={() => {
                      setIsDropdownOpen(false);
                      navigate('/notifications');
                    }}
                    style={{
                      padding: '10px',
                      textAlign: 'center',
                      backgroundColor: '#f8fafc',
                      borderTop: '1px solid #e2e8f0',
                      color: '#4f46e5',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    View All Notifications →
                  </div>
                </div>
              )}
            </div>

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

      {/* Header Item Click Detail Modal */}
      {selectedNotif && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', width: '100%', maxWidth: '520px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', color: '#0f172a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4338ca', backgroundColor: '#eef2ff', padding: '4px 10px', borderRadius: '12px', textTransform: 'uppercase' }}>
                {selectedNotif.type}
              </span>
              <button onClick={() => setSelectedNotif(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>{selectedNotif.title}</h3>
            <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: '20px' }}>{selectedNotif.message}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(selectedNotif.publishedAt || selectedNotif.createdAt).toLocaleString()}</span>
              <button onClick={() => setSelectedNotif(null)} style={{ backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </header>
  );
}

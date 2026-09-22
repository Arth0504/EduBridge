import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Heart, Search, RefreshCw, AlertTriangle, GraduationCap, MapPin, Phone } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:5000/api/v1';

export default function ParentsPage() {
  const { token } = useAuth();
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const fetchParents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE}/parents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setParents(res.data.data.parents);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch parent profiles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParents();
  }, []);

  const filteredParents = parents.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (p.userId?.fullName || '').toLowerCase().includes(q) ||
      (p.userId?.email || '').toLowerCase().includes(q) ||
      (p.occupation || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="page-body">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff' }}>Parent & Guardian Directory</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Registered parent profiles and their associated student wards.
        </p>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', color: '#f87171', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {/* Search Toolbar */}
      <div className="card" style={{ marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search parents by name, email, occupation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px 10px 38px', backgroundColor: '#0f172a',
              border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem'
            }}
          />
        </div>
        <button
          onClick={fetchParents}
          style={{ padding: '10px 14px', backgroundColor: 'var(--bg-card-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Parents Cards Grid */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading parent profiles...</div>
      ) : filteredParents.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No parent accounts found.</div>
      ) : (
        <div className="grid-cards">
          {filteredParents.map((p) => (
            <div key={p._id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div className="card-icon" style={{ backgroundColor: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
                    <Heart size={22} />
                  </div>
                  <span className="badge badge-pink">Guardian</span>
                </div>

                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                  {p.userId?.fullName || 'Parent'}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
                  {p.userId?.email} {p.userId?.phone ? `• ${p.userId.phone}` : ''}
                </p>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  <div style={{ marginBottom: '6px' }}><strong style={{ color: '#fff' }}>Occupation:</strong> {p.occupation || 'N/A'}</div>
                  <div><strong style={{ color: '#fff' }}>Address:</strong> {p.address ? `${p.address}, ${p.city}` : 'N/A'}</div>
                </div>
              </div>

              <div style={{ paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
                <strong style={{ fontSize: '0.85rem', color: '#fff', display: 'block', marginBottom: '8px' }}>Linked Children:</strong>
                {p.children && p.children.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {p.children.map((c) => (
                      <span key={c._id} className="badge badge-amber" style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                        <GraduationCap size={10} style={{ marginRight: '4px' }} />
                        {c.studentId?.fullName || 'Child'} ({c.relationship})
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No linked children yet.</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

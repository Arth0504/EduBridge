import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Briefcase, Search, RefreshCw, AlertTriangle, BookOpen, Award } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:5000/api/v1';

export default function TeachersPage() {
  const { token } = useAuth();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const fetchTeachers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE}/teachers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setTeachers(res.data.data.teachers);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch educators.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const filteredTeachers = teachers.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (t.userId?.fullName || '').toLowerCase().includes(q) ||
      (t.userId?.email || '').toLowerCase().includes(q) ||
      (t.employeeId || '').toLowerCase().includes(q) ||
      (t.department || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="page-body">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff' }}>Educator & Faculty Directory</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Institutional faculty roster, departments, subjects taught, and designations.
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
            placeholder="Search educators by name, employee ID, department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px 10px 38px', backgroundColor: '#0f172a',
              border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem'
            }}
          />
        </div>
        <button
          onClick={fetchTeachers}
          style={{ padding: '10px 14px', backgroundColor: 'var(--bg-card-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Teachers Cards Grid */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading faculty roster...</div>
      ) : filteredTeachers.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No educator records found.</div>
      ) : (
        <div className="grid-cards">
          {filteredTeachers.map((t) => (
            <div key={t._id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div className="card-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                    <Briefcase size={22} />
                  </div>
                  <span className="badge badge-emerald">{t.employeeId}</span>
                </div>

                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                  {t.userId?.fullName || 'Educator'}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
                  {t.designation || 'Teacher'} • {t.department || 'General'}
                </p>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                  <div><strong style={{ color: '#fff' }}>Email:</strong> {t.userId?.email}</div>
                  <div><strong style={{ color: '#fff' }}>Qualification:</strong> {t.qualification || 'N/A'}</div>
                  <div><strong style={{ color: '#fff' }}>Experience:</strong> {t.experienceYears ? `${t.experienceYears} Years` : 'N/A'}</div>
                  {t.subjectsTaught && t.subjectsTaught.length > 0 && (
                    <div><strong style={{ color: '#fff' }}>Subjects:</strong> {t.subjectsTaught.join(', ')}</div>
                  )}
                </div>
              </div>

              <div style={{ paddingTop: '14px', borderTop: '1px solid var(--border)', fontSize: '0.8rem', color: t.status === 'active' ? '#34d399' : '#f87171' }}>
                ● {t.status.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

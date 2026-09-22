import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap, Plus, Search, RefreshCw, AlertTriangle, CheckCircle2,
  Heart, User, BookOpen, MapPin, Link as LinkIcon, Trash2
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:5000/api/v1';

export default function StudentsPage() {
  const { token } = useAuth();
  const [students, setStudents] = useState([]);
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');

  // Link Modal State
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedParentId, setSelectedParentId] = useState('');
  const [relationship, setRelationship] = useState('father');

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE}/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setStudents(res.data.data.students);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch students.');
    } finally {
      setLoading(false);
    }
  };

  const fetchParents = async () => {
    try {
      const res = await axios.get(`${API_BASE}/parents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setParents(res.data.data.parents);
      }
    } catch (err) {
      // Ignore
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchParents();
  }, []);

  const handleOpenLinkModal = (student) => {
    setSelectedStudent(student);
    setSelectedParentId('');
    setRelationship('father');
    setShowLinkModal(true);
  };

  const handleCreateLinkSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !selectedParentId) return;

    setError(null);
    setSuccessMsg('');

    try {
      const res = await axios.post(
        `${API_BASE}/parent-child-links`,
        {
          parentId: selectedParentId,
          studentId: selectedStudent.userId._id,
          relationship
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setSuccessMsg(`Parent successfully linked to student ${selectedStudent.userId.fullName}!`);
        setShowLinkModal(false);
        fetchStudents();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to link parent and student.');
    }
  };

  const filteredStudents = students.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (s.userId?.fullName || '').toLowerCase().includes(q) ||
      (s.userId?.email || '').toLowerCase().includes(q) ||
      (s.studentId || '').toLowerCase().includes(q) ||
      (s.classId || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="page-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff' }}>Student Directory & Guardians</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Comprehensive institutional roster of enrolled students and linked parent profiles.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', color: '#f87171', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {successMsg && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', borderRadius: '8px', color: '#34d399', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 size={18} /> {successMsg}
        </div>
      )}

      {/* Search & Actions */}
      <div className="card" style={{ marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search students by name, enrollment ID, or class..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px 10px 38px', backgroundColor: '#0f172a',
              border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem'
            }}
          />
        </div>
        <button
          onClick={fetchStudents}
          style={{ padding: '10px 14px', backgroundColor: 'var(--bg-card-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Student Cards Grid */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading student profiles...</div>
      ) : filteredStudents.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No student profiles found.</div>
      ) : (
        <div className="grid-cards">
          {filteredStudents.map((s) => (
            <div key={s._id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div className="card-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                    <GraduationCap size={22} />
                  </div>
                  <span className="badge badge-amber">{s.studentId}</span>
                </div>

                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                  {s.userId?.fullName || 'Student'}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
                  {s.userId?.email}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  <div><strong style={{ color: '#fff' }}>Class:</strong> {s.classId || 'N/A'}</div>
                  <div><strong style={{ color: '#fff' }}>Roll No:</strong> {s.rollNumber || 'N/A'}</div>
                  <div><strong style={{ color: '#fff' }}>Gender:</strong> {s.gender || 'N/A'}</div>
                  <div><strong style={{ color: '#fff' }}>Blood Group:</strong> {s.bloodGroup || 'N/A'}</div>
                </div>
              </div>

              <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: s.status === 'active' ? '#34d399' : '#f87171' }}>
                  ● {s.status.toUpperCase()}
                </span>
                <button
                  onClick={() => handleOpenLinkModal(s)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                    backgroundColor: 'rgba(79, 70, 229, 0.2)', color: '#818cf8', border: '1px solid rgba(129, 140, 248, 0.3)',
                    borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  <LinkIcon size={14} /> Link Parent
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Link Parent Modal */}
      {showLinkModal && selectedStudent && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
              Link Parent Guardian
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Linking guardian for <strong style={{ color: '#fff' }}>{selectedStudent.userId?.fullName}</strong> ({selectedStudent.studentId}).
            </p>

            <form onSubmit={handleCreateLinkSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Select Registered Parent *</label>
                <select
                  required
                  value={selectedParentId}
                  onChange={(e) => setSelectedParentId(e.target.value)}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff' }}
                >
                  <option value="">-- Choose Parent Account --</option>
                  {parents.map((p) => (
                    <option key={p.userId._id} value={p.userId._id}>
                      {p.userId.fullName} ({p.userId.email})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Relationship</label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff' }}
                >
                  <option value="father">Father</option>
                  <option value="mother">Mother</option>
                  <option value="guardian">Legal Guardian</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  style={{ padding: '10px 18px', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 18px', backgroundColor: 'var(--primary)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  Confirm Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

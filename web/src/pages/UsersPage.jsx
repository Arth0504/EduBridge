import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Users, UserPlus, Search, Filter, RefreshCw, CheckCircle2,
  XCircle, AlertTriangle, Shield, User, GraduationCap, Briefcase, Heart,
  Edit2, Trash2, Eye, ExternalLink
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:5000/api/v1';

export default function UsersPage() {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalRole, setModalRole] = useState('student');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    studentId: '',
    employeeId: '',
    occupation: '',
    department: '',
    designation: '',
    qualification: '',
    classId: '',
    sectionId: '',
    rollNumber: ''
  });

  const isSuperAdmin = currentUser?.role === 'super_admin';

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `${API_BASE}/users`;
      const params = new URLSearchParams();

      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (search.trim()) params.append('search', search.trim());

      if (params.toString()) url += `?${params.toString()}`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setUsers(res.data.data.users);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg('');

    try {
      let endpoint = '/users';
      if (modalRole === 'student') endpoint = '/students';
      else if (modalRole === 'teacher') endpoint = '/teachers';
      else if (modalRole === 'parent') endpoint = '/parents';

      const payload = { ...formData, role: modalRole };

      const res = await axios.post(`${API_BASE}${endpoint}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setSuccessMsg(`User (${modalRole.replace('_', ' ')}) created successfully!`);
        setShowAddModal(false);
        setFormData({
          fullName: '', email: '', password: '', phone: '',
          studentId: '', employeeId: '', occupation: '', department: '',
          designation: '', qualification: '', classId: '', sectionId: '', rollNumber: ''
        });
        fetchUsers();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user.');
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.isActive ? 'suspended' : 'active';
    try {
      const res = await axios.patch(
        `${API_BASE}/users/${user._id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setSuccessMsg(`User status updated to ${newStatus}`);
        fetchUsers();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleSoftDelete = async (user) => {
    if (!window.confirm(`Are you sure you want to deactivate/soft-delete ${user.fullName}?`)) return;
    try {
      const res = await axios.delete(`${API_BASE}/users/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setSuccessMsg(`User account deactivated.`);
        fetchUsers();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deactivate user');
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.phone && u.phone.includes(q))
    );
  });

  const getRoleBadge = (role) => {
    switch (role) {
      case 'super_admin':
        return <span className="badge badge-purple"><Shield size={12} /> Super Admin</span>;
      case 'institution_admin':
        return <span className="badge badge-blue"><Shield size={12} /> Inst Admin</span>;
      case 'teacher':
        return <span className="badge badge-emerald"><Briefcase size={12} /> Educator</span>;
      case 'student':
        return <span className="badge badge-amber"><GraduationCap size={12} /> Student</span>;
      case 'parent':
        return <span className="badge badge-pink"><Heart size={12} /> Parent</span>;
      default:
        return <span className="badge">{role}</span>;
    }
  };

  return (
    <div className="page-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff' }}>User Management Directory</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Manage platform users, teachers, students, parents, and institution administrators.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            backgroundColor: 'var(--primary)', color: '#fff', border: 'none',
            padding: '10px 18px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer'
          }}
        >
          <UserPlus size={18} /> Add New User
        </button>
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

      {/* Filter Toolbar */}
      <div className="card" style={{ marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px 10px 38px', backgroundColor: '#0f172a',
              border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ padding: '10px 14px', backgroundColor: '#0f172a', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem' }}
          >
            <option value="all">All Roles</option>
            <option value="student">Students</option>
            <option value="teacher">Teachers</option>
            <option value="parent">Parents</option>
            <option value="institution_admin">Institution Admins</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '10px 14px', backgroundColor: '#0f172a', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem' }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive / Soft-Deleted</option>
          </select>

          <button
            onClick={fetchUsers}
            style={{ padding: '10px', backgroundColor: 'var(--bg-card-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}
            title="Refresh Directory"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading user directory...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No users found matching the selected criteria.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '14px 20px' }}>User</th>
                <th style={{ padding: '14px 20px' }}>Role</th>
                <th style={{ padding: '14px 20px' }}>Institution</th>
                <th style={{ padding: '14px 20px' }}>Status</th>
                <th style={{ padding: '14px 20px' }}>Joined Date</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u._id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontWeight: 600, color: '#fff' }}>{u.fullName}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{u.email} {u.phone ? `• ${u.phone}` : ''}</div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>{getRoleBadge(u.role)}</td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>
                    {u.institutionId ? u.institutionId.institutionName || 'Assigned' : 'System Wide'}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    {u.isActive ? (
                      <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="dot" /> Active
                      </span>
                    ) : (
                      <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f87171' }} /> Suspended/Inactive
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        onClick={() => handleToggleStatus(u)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: u.isActive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: u.isActive ? '#f87171' : '#34d399',
                          border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
                        }}
                      >
                        {u.isActive ? 'Suspend' : 'Reactivate'}
                      </button>
                      <button
                        onClick={() => handleSoftDelete(u)}
                        style={{ padding: '6px 10px', backgroundColor: 'transparent', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', cursor: 'pointer' }}
                        title="Deactivate Account"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>Create New Account</h2>

            <form onSubmit={handleAddUserSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Account Role</label>
                <select
                  value={modalRole}
                  onChange={(e) => setModalRole(e.target.value)}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff' }}
                >
                  <option value="student">Student</option>
                  <option value="teacher">Educator / Teacher</option>
                  <option value="parent">Parent</option>
                  <option value="institution_admin">Institution Admin</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Full Name *</label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Password *</label>
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Phone Number</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
              </div>

              {/* Role Specific Inputs */}
              {modalRole === 'student' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Student ID / Reg No *</label>
                    <input
                      type="text"
                      name="studentId"
                      required
                      value={formData.studentId}
                      onChange={handleInputChange}
                      placeholder="e.g. STU-2026-001"
                      style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Class / Grade</label>
                    <input
                      type="text"
                      name="classId"
                      value={formData.classId}
                      onChange={handleInputChange}
                      placeholder="e.g. Grade 10"
                      style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff' }}
                    />
                  </div>
                </div>
              )}

              {modalRole === 'teacher' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Employee ID *</label>
                    <input
                      type="text"
                      name="employeeId"
                      required
                      value={formData.employeeId}
                      onChange={handleInputChange}
                      placeholder="e.g. EMP-101"
                      style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Department</label>
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      placeholder="e.g. Science"
                      style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff' }}
                    />
                  </div>
                </div>
              )}

              {modalRole === 'parent' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Occupation</label>
                  <input
                    type="text"
                    name="occupation"
                    value={formData.occupation}
                    onChange={handleInputChange}
                    placeholder="e.g. Software Engineer"
                    style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '10px 18px', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 18px', backgroundColor: 'var(--primary)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

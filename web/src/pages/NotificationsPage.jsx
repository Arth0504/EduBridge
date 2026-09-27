import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Bell,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  Send,
  Trash2,
  Edit,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Users,
  Tag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:5000/api/v1';

export default function NotificationsPage() {
  const { user, token } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const isAdmin = role === 'super_admin' || role === 'institution_admin';

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterAudience, setFilterAudience] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); // all, published, scheduled, unread

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingNotif, setEditingNotif] = useState(null);
  const [selectedNotif, setSelectedNotif] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'announcement',
    priority: 'normal',
    targetAudience: 'all',
    targetUserIds: [],
    scheduledAt: '',
    expiresAt: '',
    isPublished: true
  });
  const [availableUsers, setAvailableUsers] = useState([]);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const authHeaders = {
    headers: { Authorization: `Bearer ${token}` }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      let url = `${API_BASE}/notifications?limit=50`;
      if (filterType !== 'all') url += `&type=${filterType}`;
      if (filterPriority !== 'all') url += `&priority=${filterPriority}`;
      if (filterAudience !== 'all') url += `&targetAudience=${filterAudience}`;
      if (filterStatus === 'unread') url += `&unread=true`;
      else if (filterStatus === 'published' || filterStatus === 'scheduled') url += `&status=${filterStatus}`;

      const res = await axios.get(url, authHeaders);
      if (res.data && res.data.success) {
        setNotifications(res.data.data.notifications || []);
        setUnreadCount(res.data.data.unreadCount || 0);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersForTargeting = async () => {
    try {
      const res = await axios.get(`${API_BASE}/users?limit=100`, authHeaders);
      if (res.data && res.data.success) {
        setAvailableUsers(res.data.data.users || []);
      }
    } catch (err) {
      console.error('Failed to load users for audience selection:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchNotifications();
    }
  }, [token, filterType, filterPriority, filterAudience, filterStatus]);

  useEffect(() => {
    if (isAdmin && token) {
      fetchUsersForTargeting();
    }
  }, [isAdmin, token]);

  const handleOpenCreate = () => {
    setEditingNotif(null);
    setFormData({
      title: '',
      message: '',
      type: 'announcement',
      priority: 'normal',
      targetAudience: 'all',
      targetUserIds: [],
      scheduledAt: '',
      expiresAt: '',
      isPublished: true
    });
    setFormError('');
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (notif) => {
    setEditingNotif(notif);
    setFormData({
      title: notif.title || '',
      message: notif.message || '',
      type: notif.type || 'announcement',
      priority: notif.priority || 'normal',
      targetAudience: notif.targetAudience || 'all',
      targetUserIds: notif.targetUserIds || [],
      scheduledAt: notif.scheduledAt ? new Date(notif.scheduledAt).toISOString().slice(0, 16) : '',
      expiresAt: notif.expiresAt ? new Date(notif.expiresAt).toISOString().slice(0, 16) : '',
      isPublished: notif.isPublished !== undefined ? notif.isPublished : true
    });
    setFormError('');
    setIsCreateModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');

    try {
      const payload = {
        ...formData,
        scheduledAt: formData.scheduledAt ? new Date(formData.scheduledAt).toISOString() : null,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null
      };

      if (editingNotif) {
        await axios.patch(`${API_BASE}/notifications/${editingNotif._id}`, payload, authHeaders);
        setSuccessMsg('Announcement updated successfully!');
      } else {
        await axios.post(`${API_BASE}/notifications`, payload, authHeaders);
        setSuccessMsg('Announcement created successfully!');
      }

      setIsCreateModalOpen(false);
      fetchNotifications();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save announcement.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteNotif = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate/delete this announcement?')) return;
    try {
      await axios.delete(`${API_BASE}/notifications/${id}`, authHeaders);
      setSuccessMsg('Announcement deactivated successfully.');
      fetchNotifications();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete announcement.');
    }
  };

  const handleViewDetail = async (notif) => {
    setSelectedNotif(notif);
    setIsDetailModalOpen(true);

    if (!notif.isRead) {
      try {
        await axios.patch(`${API_BASE}/notifications/${notif._id}/read`, {}, authHeaders);
        // update local list
        setNotifications(prev =>
          prev.map(item => (item._id === notif._id ? { ...item, isRead: true } : item))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to mark read:', err);
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await axios.patch(`${API_BASE}/notifications/read-all`, {}, authHeaders);
      setNotifications(prev => prev.map(item => ({ ...item, isRead: true })));
      setUnreadCount(0);
      setSuccessMsg('All notifications marked as read.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark all as read.');
    }
  };

  const filteredNotifs = notifications.filter(n => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
  });

  const getPriorityBadgeStyle = (priority) => {
    switch (priority) {
      case 'urgent':
        return { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' };
      case 'high':
        return { bg: '#ffedd5', color: '#9a3412', border: '#fdba74' };
      case 'normal':
        return { bg: '#e0f2fe', color: '#075985', border: '#7dd3fc' };
      default:
        return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'event': return <Calendar size={14} />;
      case 'notice': return <Info size={14} />;
      case 'reminder': return <Clock size={14} />;
      case 'system': return <AlertTriangle size={14} />;
      default: return <Bell size={14} />;
    }
  };

  return (
    <div style={{ padding: '28px', backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 64px)', color: '#0f172a' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Announcements & Notifications
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '4px' }}>
            Broadcast institutional notices, schedule reminders, and review communications.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              style={{
                backgroundColor: '#ffffff',
                color: '#4f46e5',
                border: '1px solid #cbd5e1',
                padding: '10px 16px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <CheckCircle size={16} /> Mark All as Read
            </button>
          )}

          {isAdmin && (
            <button
              onClick={handleOpenCreate}
              style={{
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
              }}
            >
              <Plus size={18} /> Create Announcement
            </button>
          )}
        </div>
      </div>

      {/* Alert Banners */}
      {successMsg && (
        <div style={{ backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #86efac', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', fontWeight: 600 }}>
          {successMsg}
        </div>
      )}
      {error && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
        
        {/* Search */}
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', paddingLeft: '38px', paddingRight: '12px', paddingTop: '8px', paddingBottom: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: '#ffffff', color: '#0f172a' }}
          />
        </div>

        {/* Type Filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: '#ffffff', color: '#0f172a' }}
        >
          <option value="all">All Types</option>
          <option value="announcement">Announcement</option>
          <option value="notice">Notice</option>
          <option value="event">Event</option>
          <option value="reminder">Reminder</option>
          <option value="system">System</option>
        </select>

        {/* Priority Filter */}
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: '#ffffff', color: '#0f172a' }}
        >
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>

        {/* Audience Filter */}
        <select
          value={filterAudience}
          onChange={(e) => setFilterAudience(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: '#ffffff', color: '#0f172a' }}
        >
          <option value="all">All Audiences</option>
          <option value="students">Students</option>
          <option value="teachers">Teachers</option>
          <option value="parents">Parents</option>
          <option value="specific_users">Specific Users</option>
        </select>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: '#ffffff', color: '#0f172a' }}
        >
          <option value="all">All Statuses</option>
          <option value="published">Published</option>
          <option value="scheduled">Scheduled</option>
          <option value="unread">Unread Only</option>
        </select>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          Loading notifications...
        </div>
      ) : filteredNotifs.length === 0 ? (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
          <Bell size={42} style={{ color: '#cbd5e1', marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.1rem', color: '#334155', fontWeight: 700, margin: '0 0 6px 0' }}>No Notifications Found</h3>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
            {searchQuery || filterType !== 'all' ? 'Try changing your search or filter options.' : 'There are no active notifications at this time.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
          {filteredNotifs.map((notif) => {
            const pBadge = getPriorityBadgeStyle(notif.priority);
            const isUnread = !notif.isRead;

            return (
              <div
                key={notif._id}
                style={{
                  backgroundColor: isUnread ? '#ffffff' : '#f8fafc',
                  border: isUnread ? '2px solid #6366f1' : '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: isUnread ? '0 4px 6px -1px rgba(99, 102, 241, 0.08)' : '0 1px 2px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Card Top Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isUnread && (
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#6366f1', display: 'inline-block' }}></span>
                    )}

                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px', backgroundColor: '#eef2ff', color: '#4338ca', fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize' }}>
                      {getTypeIcon(notif.type)} {notif.type}
                    </span>

                    <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '20px', backgroundColor: pBadge.bg, color: pBadge.color, border: `1px solid ${pBadge.border}`, fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize' }}>
                      {notif.priority}
                    </span>

                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px', backgroundColor: '#f1f5f9', color: '#475569', fontSize: '0.75rem', fontWeight: 600 }}>
                      <Users size={12} /> Target: {notif.targetAudience}
                    </span>

                    {!notif.isPublished && (
                      <span style={{ padding: '4px 10px', borderRadius: '20px', backgroundColor: '#fef3c7', color: '#92400e', fontSize: '0.75rem', fontWeight: 700 }}>
                        Scheduled
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {new Date(notif.publishedAt || notif.createdAt).toLocaleString()}
                  </div>
                </div>

                {/* Title & Message */}
                <div>
                  <h3
                    onClick={() => handleViewDetail(notif)}
                    style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0', cursor: 'pointer' }}
                  >
                    {notif.title}
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: '#475569', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {notif.message}
                  </p>
                </div>

                {/* Footer Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Sender: <strong>{notif.senderId?.fullName || 'Institution Admin'}</strong> ({notif.senderRole})
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => handleViewDetail(notif)}
                      style={{ border: 'none', backgroundColor: '#e0e7ff', color: '#4338ca', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Eye size={14} /> Read
                    </button>

                    {isAdmin && (
                      <>
                        <button
                          onClick={() => handleOpenEdit(notif)}
                          style={{ border: 'none', backgroundColor: '#f1f5f9', color: '#334155', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Edit size={14} /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteNotif(notif._id)}
                          style={{ border: 'none', backgroundColor: '#fee2e2', color: '#991b1b', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT ANNOUNCEMENT MODAL */}
      {isCreateModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', padding: '28px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {editingNotif ? 'Edit Announcement' : 'Create New Announcement'}
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <XCircle size={22} />
              </button>
            </div>

            {formError && (
              <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mid-Term Examination Schedule Released"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#0f172a' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Message Content *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide complete message details for recipients..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#0f172a', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Notification Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#0f172a' }}
                  >
                    <option value="announcement">Announcement</option>
                    <option value="notice">Notice</option>
                    <option value="event">Event</option>
                    <option value="reminder">Reminder</option>
                    <option value="system">System</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Priority Level
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#0f172a' }}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Target Audience
                  </label>
                  <select
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#0f172a' }}
                  >
                    <option value="all">Everyone (All Roles)</option>
                    <option value="students">Students Only</option>
                    <option value="teachers">Teachers Only</option>
                    <option value="parents">Parents Only</option>
                    <option value="specific_users">Specific Users</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Publish Mode
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '8px' }}>
                    <input
                      type="checkbox"
                      id="isPublishedCheck"
                      checked={formData.isPublished}
                      onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                      style={{ width: '18px', height: '18px', accentColor: '#4f46e5' }}
                    />
                    <label htmlFor="isPublishedCheck" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', cursor: 'pointer' }}>
                      Publish Immediately
                    </label>
                  </div>
                </div>
              </div>

              {formData.targetAudience === 'specific_users' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Select Target Users (Hold Ctrl/Cmd to select multiple)
                  </label>
                  <select
                    multiple
                    size={4}
                    value={formData.targetUserIds}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, opt => opt.value);
                      setFormData({ ...formData, targetUserIds: selected });
                    }}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#0f172a' }}
                  >
                    {availableUsers.map(u => (
                      <option key={u._id} value={u._id}>
                        {u.fullName} ({u.email} - {u.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Scheduled Release (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduledAt}
                    onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#0f172a' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Expiration Date (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#0f172a' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{ backgroundColor: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', padding: '10px 18px', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  style={{ backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', padding: '10px 22px', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Send size={16} /> {formSubmitting ? 'Saving...' : editingNotif ? 'Update Announcement' : 'Post Announcement'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAIL MODAL */}
      {isDetailModalOpen && selectedNotif && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', width: '100%', maxWidth: '580px', padding: '28px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', backgroundColor: '#eef2ff', color: '#4338ca', fontSize: '0.8rem', fontWeight: 700, textTransform: 'capitalize' }}>
                {getTypeIcon(selectedNotif.type)} {selectedNotif.type}
              </span>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <XCircle size={22} />
              </button>
            </div>

            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: '0 0 12px 0' }}>
              {selectedNotif.title}
            </h2>

            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <div>Priority: <strong>{selectedNotif.priority}</strong></div>
              <div>Audience: <strong>{selectedNotif.targetAudience}</strong></div>
              <div>Posted: <strong>{new Date(selectedNotif.publishedAt || selectedNotif.createdAt).toLocaleString()}</strong></div>
            </div>

            <div style={{ fontSize: '0.95rem', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: '24px' }}>
              {selectedNotif.message}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                style={{ backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', padding: '8px 20px', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

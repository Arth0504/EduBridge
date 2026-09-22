import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Building2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  Check,
  Ban,
  RotateCcw,
  Search,
  X
} from 'lucide-react';

export default function SuperAdminInstitutionsPage() {
  const [institutions, setInstitutions] = useState([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, suspended: 0 });
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedInst, setSelectedInst] = useState(null);
  const [rejectModalInst, setRejectModalInst] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchInstitutions = async (status = activeTab) => {
    setLoading(true);
    try {
      const url = status === 'all'
        ? 'http://localhost:5000/api/v1/institutions'
        : `http://localhost:5000/api/v1/institutions?status=${status}`;

      const res = await axios.get(url);
      if (res.data && res.data.success) {
        setInstitutions(res.data.data.institutions);
        if (res.data.data.counts) {
          setCounts(res.data.data.counts);
        }
      }
    } catch (err) {
      console.error('Failed to fetch institutions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstitutions(activeTab);
  }, [activeTab]);

  const handleApprove = async (id) => {
    setActionLoading(true);
    try {
      await axios.patch(`http://localhost:5000/api/v1/institutions/${id}/approve`);
      fetchInstitutions(activeTab);
      if (selectedInst) setSelectedInst(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) return;

    setActionLoading(true);
    try {
      await axios.patch(`http://localhost:5000/api/v1/institutions/${rejectModalInst._id}/reject`, {
        rejectionReason
      });
      setRejectModalInst(null);
      setRejectionReason('');
      fetchInstitutions(activeTab);
      if (selectedInst) setSelectedInst(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Rejection failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async (id) => {
    setActionLoading(true);
    try {
      await axios.patch(`http://localhost:5000/api/v1/institutions/${id}/suspend`);
      fetchInstitutions(activeTab);
      if (selectedInst) setSelectedInst(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Suspension failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async (id) => {
    setActionLoading(true);
    try {
      await axios.patch(`http://localhost:5000/api/v1/institutions/${id}/reactivate`);
      fetchInstitutions(activeTab);
      if (selectedInst) setSelectedInst(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Reactivation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredInstitutions = institutions.filter((inst) => {
    const q = searchQuery.toLowerCase();
    return (
      inst.institutionName.toLowerCase().includes(q) ||
      inst.institutionCode.toLowerCase().includes(q) ||
      inst.email.toLowerCase().includes(q) ||
      (inst.proposedAdmin?.email || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="page-body">
      
      {/* Header Banner */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff' }}>System Institution Hub</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
          Super Admin governance portal: Review pending registrations, approve tenant onboarding, and enforce access controls.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Total</span>
            <Building2 size={18} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>{counts.total}</div>
        </div>

        <div className="card" style={{ padding: '16px', borderColor: counts.pending > 0 ? '#eab308' : '#334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#eab308', fontWeight: 600 }}>Pending</span>
            <Clock size={18} color="#eab308" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#eab308' }}>{counts.pending}</div>
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>Approved</span>
            <CheckCircle size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>{counts.approved}</div>
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#f87171', fontWeight: 600 }}>Rejected</span>
            <XCircle size={18} color="#f87171" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f87171' }}>{counts.rejected}</div>
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#fb923c', fontWeight: 600 }}>Suspended</span>
            <AlertTriangle size={18} color="#fb923c" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fb923c' }}>{counts.suspended}</div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        
        <div style={{ display: 'flex', gap: '8px', backgroundColor: '#090d16', padding: '4px', borderRadius: '10px', border: '1px solid #334155' }}>
          {['all', 'pending', 'approved', 'rejected', 'suspended'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                backgroundColor: activeTab === tab ? '#4f46e5' : 'transparent',
                color: activeTab === tab ? '#ffffff' : '#94a3b8',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.85rem',
                textTransform: 'capitalize',
                cursor: 'pointer'
              }}
            >
              {tab} {tab === 'pending' && counts.pending > 0 && `(${counts.pending})`}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', minWidth: '260px' }}>
          <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
          <input
            type="text"
            placeholder="Search by name, code, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px 10px 36px', color: '#ffffff', fontSize: '0.85rem' }}
          />
        </div>

      </div>

      {/* Data Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#090d16', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
              <th style={{ padding: '16px 20px' }}>Institution</th>
              <th style={{ padding: '16px' }}>Code & Type</th>
              <th style={{ padding: '16px' }}>Proposed Admin</th>
              <th style={{ padding: '16px' }}>Status</th>
              <th style={{ padding: '16px 20px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading institutions...</td>
              </tr>
            ) : filteredInstitutions.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No institutions found matching criteria.</td>
              </tr>
            ) : (
              filteredInstitutions.map((inst) => (
                <tr key={inst._id} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 700, color: '#ffffff' }}>{inst.institutionName}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{inst.city}, {inst.state}</div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ color: '#38bdf8', fontWeight: 700, fontSize: '0.85rem' }}>{inst.institutionCode}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{inst.institutionType}</div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ color: '#cbd5e1' }}>{inst.proposedAdmin?.fullName || 'N/A'}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{inst.proposedAdmin?.email || inst.email}</div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <StatusBadge status={inst.registrationStatus} />
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      
                      <button
                        onClick={() => setSelectedInst(inst)}
                        title="View Details"
                        style={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        <Eye size={14} />
                      </button>

                      {inst.registrationStatus === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(inst._id)}
                            disabled={actionLoading}
                            style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectModalInst(inst)}
                            disabled={actionLoading}
                            style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {inst.registrationStatus === 'approved' && (
                        <button
                          onClick={() => handleSuspend(inst._id)}
                          disabled={actionLoading}
                          style={{ backgroundColor: 'rgba(249, 115, 22, 0.15)', border: '1px solid rgba(249, 115, 22, 0.3)', color: '#fb923c', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                        >
                          Suspend
                        </button>
                      )}

                      {inst.registrationStatus === 'suspended' && (
                        <button
                          onClick={() => handleReactivate(inst._id)}
                          disabled={actionLoading}
                          style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                        >
                          Reactivate
                        </button>
                      )}

                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Reject Modal */}
      {rejectModalInst && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '460px', padding: '28px', borderRadius: '14px', backgroundColor: '#1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#ffffff' }}>Reject Registration Application</h3>
              <X size={20} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={() => setRejectModalInst(null)} />
            </div>

            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '16px' }}>
              You are rejecting the onboarding request for <strong>{rejectModalInst.institutionName}</strong>. Please provide a clear rejection reason.
            </p>

            <form onSubmit={handleRejectSubmit}>
              <textarea
                required
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Specify rejection reason (e.g., Invalid accreditation documentation)..."
                style={{ width: '100%', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '8px', padding: '12px', color: '#ffffff', fontSize: '0.9rem', marginBottom: '20px' }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setRejectModalInst(null)}
                  style={{ backgroundColor: '#334155', color: '#ffffff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ backgroundColor: '#ef4444', color: '#ffffff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details View Modal */}
      {selectedInst && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '560px', padding: '32px', borderRadius: '16px', backgroundColor: '#1e293b', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', color: '#ffffff' }}>{selectedInst.institutionName}</h2>
                <span style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 700 }}>Code: {selectedInst.institutionCode}</span>
              </div>
              <X size={22} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={() => setSelectedInst(null)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.9rem', marginBottom: '20px' }}>
              <div><strong>Type:</strong> {selectedInst.institutionType}</div>
              <div><strong>Status:</strong> <StatusBadge status={selectedInst.registrationStatus} /></div>
              <div><strong>Email:</strong> {selectedInst.email}</div>
              <div><strong>Phone:</strong> {selectedInst.phone}</div>
              <div><strong>Website:</strong> {selectedInst.website || 'N/A'}</div>
              <div><strong>Established:</strong> {selectedInst.establishedYear || 'N/A'}</div>
              <div style={{ gridColumn: 'span 2' }}>
                <strong>Address:</strong> {selectedInst.address}, {selectedInst.city}, {selectedInst.state} - {selectedInst.postalCode}, {selectedInst.country}
              </div>
            </div>

            <h4 style={{ color: '#38bdf8', marginBottom: '8px', borderTop: '1px solid #334155', paddingTop: '16px' }}>Proposed Institution Admin</h4>
            <div style={{ backgroundColor: '#090d16', padding: '12px 16px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '20px' }}>
              <div><strong>Name:</strong> {selectedInst.proposedAdmin?.fullName}</div>
              <div style={{ marginTop: '4px' }}><strong>Email:</strong> {selectedInst.proposedAdmin?.email}</div>
              <div style={{ marginTop: '4px' }}><strong>Phone:</strong> {selectedInst.proposedAdmin?.phone || 'N/A'}</div>
            </div>

            {selectedInst.rejectionReason && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', color: '#f87171', marginBottom: '20px' }}>
                <strong>Rejection Reason:</strong> {selectedInst.rejectionReason}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              {selectedInst.registrationStatus === 'pending' && (
                <>
                  <button onClick={() => handleApprove(selectedInst._id)} style={{ backgroundColor: '#10b981', color: '#ffffff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                    Approve Request
                  </button>
                  <button onClick={() => { setRejectModalInst(selectedInst); setSelectedInst(null); }} style={{ backgroundColor: '#ef4444', color: '#ffffff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                    Reject Request
                  </button>
                </>
              )}
              <button onClick={() => setSelectedInst(null)} style={{ backgroundColor: '#334155', color: '#ffffff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: { bg: 'rgba(234, 179, 8, 0.15)', color: '#eab308', text: 'PENDING' },
    approved: { bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', text: 'APPROVED' },
    rejected: { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', text: 'REJECTED' },
    suspended: { bg: 'rgba(249, 115, 22, 0.15)', color: '#fb923c', text: 'SUSPENDED' }
  };

  const current = styles[status] || { bg: '#334155', color: '#94a3b8', text: status };

  return (
    <span style={{ backgroundColor: current.bg, color: current.color, padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-block' }}>
      {current.text}
    </span>
  );
}

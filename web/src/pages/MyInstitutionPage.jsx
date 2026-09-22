import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Building2, Save, ShieldCheck, CheckCircle } from 'lucide-react';

export default function MyInstitutionPage() {
  const [institution, setInstitution] = useState(null);
  const [formData, setFormData] = useState({
    phone: '',
    website: '',
    description: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    logo: '',
    establishedYear: ''
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const fetchMyInstitution = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/v1/institutions/my-institution');
      if (res.data && res.data.success) {
        const inst = res.data.data.institution;
        setInstitution(inst);
        setFormData({
          phone: inst.phone || '',
          website: inst.website || '',
          description: inst.description || '',
          address: inst.address || '',
          city: inst.city || '',
          state: inst.state || '',
          postalCode: inst.postalCode || '',
          logo: inst.logo || '',
          establishedYear: inst.establishedYear || ''
        });
      }
    } catch (err) {
      console.error('Failed to load institution profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyInstitution();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    try {
      const res = await axios.patch('http://localhost:5000/api/v1/institutions/my-institution', formData);
      if (res.data && res.data.success) {
        setInstitution(res.data.data.institution);
        setMessage('Institution profile updated successfully!');
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Update failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-body">
        <p style={{ color: '#94a3b8' }}>Loading institution profile...</p>
      </div>
    );
  }

  if (!institution) {
    return (
      <div className="page-body">
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <h3 style={{ color: '#ffffff' }}>No Institution Profile Found</h3>
          <p style={{ color: '#94a3b8', marginTop: '8px' }}>Your user account is not associated with an institution.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-body">
      
      {/* Hero Card */}
      <div className="welcome-hero" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
              OFFICIAL INSTITUTION PORTAL
            </span>
            <h1 className="welcome-title" style={{ fontSize: '1.8rem', marginTop: '8px' }}>{institution.institutionName}</h1>
            <p className="welcome-subtitle" style={{ fontSize: '1rem', marginBottom: 0 }}>
              {institution.city}, {institution.state} | {institution.institutionType}
            </p>
          </div>

          <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '16px 20px', borderRadius: '12px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>INSTITUTION CODE</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8' }}>{institution.institutionCode}</div>
          </div>
        </div>
      </div>

      {message && (
        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '14px', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
          <CheckCircle size={18} />
          <span>{message}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        
        {/* Editable Profile Form */}
        <div className="card">
          <h3 style={{ fontSize: '1.2rem', color: '#ffffff', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
            Edit Institution Information
          </h3>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                  Contact Phone
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  style={{ width: '100%', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#ffffff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                  Website URL
                </label>
                <input
                  type="text"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  style={{ width: '100%', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#ffffff' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                Street Address
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                style={{ width: '100%', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#ffffff' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>City</label>
                <input type="text" name="city" value={formData.city} onChange={handleChange} style={{ width: '100%', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#ffffff' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>State</label>
                <input type="text" name="state" value={formData.state} onChange={handleChange} style={{ width: '100%', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#ffffff' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>Postal Code</label>
                <input type="text" name="postalCode" value={formData.postalCode} onChange={handleChange} style={{ width: '100%', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#ffffff' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                Institution Description
              </label>
              <textarea
                rows={4}
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Overview of institutional academic programs and facilities..."
                style={{ width: '100%', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#ffffff' }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{ backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '12px 20px', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '200px' }}
            >
              <Save size={16} />
              <span>{submitting ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </form>
        </div>

        {/* Read-Only Governance Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="card">
            <h4 style={{ fontSize: '1rem', color: '#ffffff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="#10b981" />
              Governance & Security
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem', color: '#94a3b8' }}>
              <div>
                <strong style={{ color: '#cbd5e1' }}>Registration Status:</strong>
                <div style={{ marginTop: '4px' }}>
                  <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                    {institution.registrationStatus.toUpperCase()}
                  </span>
                </div>
              </div>

              <div>
                <strong style={{ color: '#cbd5e1' }}>System ID:</strong>
                <div style={{ fontFamily: 'monospace', color: '#38bdf8', marginTop: '2px' }}>{institution._id}</div>
              </div>

              <div>
                <strong style={{ color: '#cbd5e1' }}>Official Email:</strong>
                <div style={{ color: '#ffffff', marginTop: '2px' }}>{institution.email}</div>
              </div>

              <div>
                <strong style={{ color: '#cbd5e1' }}>Approved At:</strong>
                <div style={{ color: '#ffffff', marginTop: '2px' }}>
                  {institution.approvedAt ? new Date(institution.approvedAt).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            </div>
            
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '16px', borderTop: '1px solid #334155', paddingTop: '12px' }}>
              * Security parameters and status classifications are controlled exclusively by system Super Administration.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}

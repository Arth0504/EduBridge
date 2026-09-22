import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Building2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

export default function InstitutionRegisterPage() {
  const [formData, setFormData] = useState({
    institutionName: '',
    institutionType: 'School',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    postalCode: '',
    establishedYear: '',
    description: '',
    proposedAdmin: {
      fullName: '',
      email: '',
      phone: ''
    }
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('admin_')) {
      const field = name.replace('admin_', '');
      setFormData((prev) => ({
        ...prev,
        proposedAdmin: { ...prev.proposedAdmin, [field]: value }
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSubmitting(true);

    try {
      const response = await axios.post('http://localhost:5000/api/v1/institutions/register', formData);
      if (response.data && response.data.success) {
        setSuccessData(response.data.data.institution);
      } else {
        setErrorMessage(response.data.message || 'Registration failed.');
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Server error submitting institution registration.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', padding: '40px 20px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        
        <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#818cf8', textDecoration: 'none', marginBottom: '24px', fontSize: '0.9rem', fontWeight: 600 }}>
          <ArrowLeft size={16} /> Back to Sign In
        </Link>

        <div className="card" style={{ padding: '36px', borderRadius: '16px', backgroundColor: '#1e293b', border: '1px solid #334155' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ margin: '0 auto 16px auto', width: '52px', height: '52px', borderRadius: '12px', background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={28} color="#ffffff" />
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff' }}>Institution Onboarding Application</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginTop: '6px' }}>
              Register your school, college, or university on the EduBridge Multi-Institution Platform
            </p>
          </div>

          {successData ? (
            <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '28px', textAlign: 'center' }}>
              <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 16px auto' }} />
              <h2 style={{ fontSize: '1.4rem', color: '#ffffff', marginBottom: '8px' }}>Application Submitted!</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '20px' }}>
                Your institution registration has been submitted successfully and is currently <strong>PENDING REVIEW</strong> by the System Super Admin.
              </p>
              <div style={{ backgroundColor: '#090d16', padding: '16px', borderRadius: '8px', marginBottom: '24px', textAlign: 'left', fontSize: '0.9rem' }}>
                <div><strong>Institution Name:</strong> {successData.institutionName}</div>
                <div style={{ marginTop: '4px' }}><strong>Assigned Code:</strong> <span style={{ color: '#38bdf8', fontWeight: 700 }}>{successData.institutionCode}</span></div>
                <div style={{ marginTop: '4px' }}><strong>Proposed Admin:</strong> {successData.proposedAdmin.fullName} ({successData.proposedAdmin.email})</div>
                <div style={{ marginTop: '4px' }}><strong>Status:</strong> <span className="badge" style={{ backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }}>PENDING REVIEW</span></div>
              </div>
              <Link to="/login" style={{ display: 'inline-block', backgroundColor: '#4f46e5', color: '#ffffff', textDecoration: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 700 }}>
                Return to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {errorMessage && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <h3 style={{ fontSize: '1.05rem', color: '#38bdf8', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
                1. Institution Profile Details
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                    Institution Name *
                  </label>
                  <input
                    type="text"
                    name="institutionName"
                    required
                    value={formData.institutionName}
                    onChange={handleChange}
                    placeholder="e.g. St. Xavier International School"
                    style={{ width: '100%', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#ffffff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                    Institution Type *
                  </label>
                  <select
                    name="institutionType"
                    value={formData.institutionType}
                    onChange={handleChange}
                    style={{ width: '100%', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#ffffff' }}
                  >
                    <option value="School">School</option>
                    <option value="College">College</option>
                    <option value="University">University</option>
                    <option value="Coaching Institute">Coaching Institute</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                    Official Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="info@stxavier.edu.in"
                    style={{ width: '100%', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#ffffff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                    Contact Phone *
                  </label>
                  <input
                    type="text"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 9876543210"
                    style={{ width: '100%', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#ffffff' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                    Website URL (Optional)
                  </label>
                  <input
                    type="text"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://stxavier.edu.in"
                    style={{ width: '100%', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#ffffff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                    Established Year
                  </label>
                  <input
                    type="number"
                    name="establishedYear"
                    value={formData.establishedYear}
                    onChange={handleChange}
                    placeholder="1995"
                    style={{ width: '100%', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#ffffff' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                  Street Address *
                </label>
                <input
                  type="text"
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="123 Campus Boulevard"
                  style={{ width: '100%', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#ffffff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>City *</label>
                  <input type="text" name="city" required value={formData.city} onChange={handleChange} placeholder="Mumbai" style={{ width: '100%', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#ffffff' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>State *</label>
                  <input type="text" name="state" required value={formData.state} onChange={handleChange} placeholder="Maharashtra" style={{ width: '100%', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#ffffff' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>Postal Code *</label>
                  <input type="text" name="postalCode" required value={formData.postalCode} onChange={handleChange} placeholder="400001" style={{ width: '100%', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#ffffff' }} />
                </div>
              </div>

              <h3 style={{ fontSize: '1.05rem', color: '#38bdf8', borderBottom: '1px solid #334155', paddingBottom: '8px', marginTop: '10px' }}>
                2. Proposed Institution Admin Details
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '-12px' }}>
                Upon Super Admin approval, this user will be provisioned as the primary Institution Administrator.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                    Admin Full Name *
                  </label>
                  <input
                    type="text"
                    name="admin_fullName"
                    required
                    value={formData.proposedAdmin.fullName}
                    onChange={handleChange}
                    placeholder="Robert Dsouza"
                    style={{ width: '100%', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#ffffff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                    Admin Email *
                  </label>
                  <input
                    type="email"
                    name="admin_email"
                    required
                    value={formData.proposedAdmin.email}
                    onChange={handleChange}
                    placeholder="admin@stxavier.edu.in"
                    style={{ width: '100%', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#ffffff' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{ width: '100%', backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '1rem', fontWeight: 700, cursor: submitting ? 'wait' : 'pointer', marginTop: '12px' }}
              >
                {submitting ? 'Submitting Application...' : 'Submit Institution Application'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}

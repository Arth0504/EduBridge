import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, UserPlus, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSubmitting(true);

    const result = await register({ fullName, email, password, role });
    setSubmitting(false);

    if (result.success) {
      navigate('/');
    } else {
      setErrorMessage(result.message);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#0f172a', padding: '20px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '36px', borderRadius: '16px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div className="brand-icon" style={{ margin: '0 auto 16px auto', width: '48px', height: '48px' }}>
            <GraduationCap size={28} color="#ffffff" />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>Create Account</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px' }}>
            Public Registration for Students & Parents
          </p>
        </div>

        {errorMessage && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              style={{ width: '100%', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '8px', padding: '12px 14px', color: '#ffffff', fontSize: '0.95rem', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              style={{ width: '100%', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '8px', padding: '12px 14px', color: '#ffffff', fontSize: '0.95rem', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="•••••••• (Min 6 characters)"
              style={{ width: '100%', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '8px', padding: '12px 14px', color: '#ffffff', fontSize: '0.95rem', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
              Account Role
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setRole('student')}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid', borderColor: role === 'student' ? '#4f46e5' : '#334155', backgroundColor: role === 'student' ? 'rgba(79, 70, 229, 0.2)' : '#090d16', color: role === 'student' ? '#818cf8' : '#94a3b8', fontWeight: 600, cursor: 'pointer' }}
              >
                🎓 Student
              </button>
              <button
                type="button"
                onClick={() => setRole('parent')}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid', borderColor: role === 'parent' ? '#4f46e5' : '#334155', backgroundColor: role === 'parent' ? 'rgba(79, 70, 229, 0.2)' : '#090d16', color: role === 'parent' ? '#818cf8' : '#94a3b8', fontWeight: 600, cursor: 'pointer' }}
              >
                👨‍👩‍👧 Parent
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
              * Administrative and teaching roles must be provisioned by institution management.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{ width: '100%', backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '14px', fontSize: '1rem', fontWeight: 700, cursor: submitting ? 'wait' : 'pointer', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <UserPlus size={18} />
            <span>{submitting ? 'Creating Account...' : 'Register Account'}</span>
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 600 }}>
            Sign In
          </Link>
        </div>

      </div>
    </div>
  );
}

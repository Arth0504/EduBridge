import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#94a3b8' }}>
        <p>Verifying authentication session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = (user?.role || '').toLowerCase();
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());

    if (!normalizedAllowed.includes(userRole)) {
      return (
        <div className="page-body">
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <h2 style={{ color: '#ef4444', marginBottom: '12px' }}>Access Restricted (403 Forbidden)</h2>
            <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
              Your account role (<strong>{user?.role}</strong>) does not have authorization to view this page.
            </p>
            <a href="/" className="badge" style={{ textDecoration: 'none', cursor: 'pointer' }}>
              Return to Overview
            </a>
          </div>
        </div>
      );
    }
  }

  return children;
}

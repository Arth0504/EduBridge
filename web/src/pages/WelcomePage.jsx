import React from 'react';
import { Building2, Users, ShieldCheck, Cpu, Smartphone, Globe } from 'lucide-react';

export default function WelcomePage() {
  return (
    <div className="page-body">
      <div className="welcome-hero">
        <span className="badge">Multi-Institution Architecture</span>
        <h1 className="welcome-title">EduBridge Administration Platform</h1>
        <p className="welcome-subtitle">
          Unified governance, tenant isolation, and centralized management for educational institutions, academies, and mobile learning ecosystems.
        </p>
      </div>

      <div className="grid-cards">
        <div className="card">
          <div className="card-icon" style={{ color: '#38bdf8' }}>
            <Building2 size={24} />
          </div>
          <h3 className="card-title">Multi-Institution Management</h3>
          <p className="card-desc">
            Isolated tenant schemas (`institutionId`) enabling multiple schools and colleges to share backend infrastructure securely.
          </p>
        </div>

        <div className="card">
          <div className="card-icon" style={{ color: '#8b5cf6' }}>
            <ShieldCheck size={24} />
          </div>
          <h3 className="card-title">Role-Based Access Control</h3>
          <p className="card-desc">
            Granular permissions for SuperAdmin, InstitutionAdmin, Teachers, Students, and Parents.
          </p>
        </div>

        <div className="card">
          <div className="card-icon" style={{ color: '#10b981' }}>
            <Smartphone size={24} />
          </div>
          <h3 className="card-title">React Native Expo Ecosystem</h3>
          <p className="card-desc">
            Seamless cross-platform mobile access optimized for physical devices using Expo Go.
          </p>
        </div>

        <div className="card">
          <div className="card-icon" style={{ color: '#f59e0b' }}>
            <Cpu size={24} />
          </div>
          <h3 className="card-title">RESTful Node.js API</h3>
          <p className="card-desc">
            Express.js backend with Mongoose ODM, MongoDB connection health tracking, and security middleware.
          </p>
        </div>
      </div>
    </div>
  );
}

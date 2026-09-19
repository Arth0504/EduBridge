import React from 'react';
import { Layers } from 'lucide-react';

export default function DashboardPlaceholder({ title, description }) {
  return (
    <div className="page-body">
      <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ margin: '0 auto 16px auto', width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(79, 70, 229, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
          <Layers size={28} />
        </div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: '#ffffff' }}>{title}</h2>
        <p style={{ color: '#94a3b8', maxWidth: '500px', margin: '0 auto 24px auto' }}>{description}</p>
        <span className="badge" style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', color: '#eab308', borderColor: 'rgba(234, 179, 8, 0.2)' }}>
          Module Scaffolded & Ready for Development
        </span>
      </div>
    </div>
  );
}

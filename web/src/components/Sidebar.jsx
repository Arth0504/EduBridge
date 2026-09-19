import React from 'react';
import { NavLink } from 'react-router-dom';
import { GraduationCap, LayoutDashboard, Building2, Users, Shield, Settings } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand-header">
        <div className="brand-icon">
          <GraduationCap size={22} color="#ffffff" />
        </div>
        <span>EduBridge</span>
      </div>

      <ul className="nav-links">
        <li className="nav-item">
          <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')}>
            <LayoutDashboard size={18} />
            <span>Overview</span>
          </NavLink>
        </li>
        <li className="nav-item">
          <NavLink to="/institutions" className={({ isActive }) => (isActive ? 'active' : '')}>
            <Building2 size={18} />
            <span>Institutions</span>
          </NavLink>
        </li>
        <li className="nav-item">
          <NavLink to="/users" className={({ isActive }) => (isActive ? 'active' : '')}>
            <Users size={18} />
            <span>User Directory</span>
          </NavLink>
        </li>
        <li className="nav-item">
          <NavLink to="/roles" className={({ isActive }) => (isActive ? 'active' : '')}>
            <Shield size={18} />
            <span>Roles & Access</span>
          </NavLink>
        </li>
        <li className="nav-item">
          <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
            <Settings size={18} />
            <span>Settings</span>
          </NavLink>
        </li>
      </ul>
    </aside>
  );
}

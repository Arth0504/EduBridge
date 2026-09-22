import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import WelcomePage from './pages/WelcomePage';
import DashboardPlaceholder from './pages/DashboardPlaceholder';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

function MainLayout() {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Header />
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route
            path="/institutions"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'institution_admin']}>
                <DashboardPlaceholder
                  title="Institution Management"
                  description="Register, configure, and monitor affiliated schools, academies, and university campuses."
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'institution_admin', 'teacher']}>
                <DashboardPlaceholder
                  title="User Directory"
                  description="Manage platform administrators, institution heads, educators, students, and parent accounts."
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/roles"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <DashboardPlaceholder
                  title="Roles & Access Control"
                  description="Define institutional permission matrices, security scopes, and API key policies."
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'institution_admin']}>
                <DashboardPlaceholder
                  title="Platform Settings"
                  description="Global system configuration, database connection parameters, and authentication security."
                />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

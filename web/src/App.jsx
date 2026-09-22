import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import WelcomePage from './pages/WelcomePage';
import DashboardPlaceholder from './pages/DashboardPlaceholder';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import InstitutionRegisterPage from './pages/InstitutionRegisterPage';
import SuperAdminInstitutionsPage from './pages/SuperAdminInstitutionsPage';
import UsersPage from './pages/UsersPage';
import StudentsPage from './pages/StudentsPage';
import TeachersPage from './pages/TeachersPage';
import ParentsPage from './pages/ParentsPage';

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
              <ProtectedRoute allowedRoles={['super_admin']}>
                <SuperAdminInstitutionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-institution"
            element={
              <ProtectedRoute allowedRoles={['institution_admin']}>
                <MyInstitutionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'institution_admin', 'teacher']}>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/students"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'institution_admin', 'teacher']}>
                <StudentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teachers"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'institution_admin']}>
                <TeachersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parents"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'institution_admin', 'teacher']}>
                <ParentsPage />
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
              <ProtectedRoute>
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
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/register-institution" element={<InstitutionRegisterPage />} />

          {/* Protected Main Layout */}
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

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import WelcomePage from './pages/WelcomePage';
import DashboardPlaceholder from './pages/DashboardPlaceholder';

export default function App() {
  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Header />
          <Routes>
            <Route path="/" element={<WelcomePage />} />
            <Route
              path="/institutions"
              element={
                <DashboardPlaceholder
                  title="Institution Management"
                  description="Register, configure, and monitor affiliated schools, academies, and university campuses."
                />
              }
            />
            <Route
              path="/users"
              element={
                <DashboardPlaceholder
                  title="User Directory"
                  description="Manage platform administrators, institution heads, educators, students, and parent accounts."
                />
              }
            />
            <Route
              path="/roles"
              element={
                <DashboardPlaceholder
                  title="Roles & Access Control"
                  description="Define institutional permission matrices, security scopes, and API key policies."
                />
              }
            />
            <Route
              path="/settings"
              element={
                <DashboardPlaceholder
                  title="Platform Settings"
                  description="Global system configuration, database connection parameters, and authentication security."
                />
              }
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

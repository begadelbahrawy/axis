import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppDataProvider } from './context/AppDataContext';
import Login from './pages/Login';
import AppShell from './components/Shell/AppShell';
import Dashboard from './pages/Dashboard';
import NewApplication from './pages/NewApplication';
import Preview from './pages/Preview';
import Records from './pages/Records';
import Lookup from './pages/Lookup';
import Fleet from './pages/Fleet';
import Countries from './pages/Countries';
import DomesticAirports from './pages/DomesticAirports';
import ManagerApproval from './pages/ManagerApproval';
import UserManagement from './pages/UserManagement';
import UserSettings from './pages/UserSettings';
import ActivityLog from './pages/ActivityLog';

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4A1656' }}>Loading AXIS…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function Shell() {
  return (
    <AppDataProvider>
      <AppShell>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/new" element={<NewApplication />} />
          <Route path="/preview/:id" element={<Preview />} />
          <Route path="/records" element={<Records />} />
          <Route path="/lookup" element={<Lookup />} />
          <Route path="/fleet" element={<Fleet />} />
          <Route path="/countries" element={<Countries />} />
          <Route path="/domestic-airports" element={<DomesticAirports />} />
          <Route path="/manager-approval" element={<ManagerApproval />} />
          <Route path="/admin" element={<UserManagement />} />
          <Route path="/account" element={<UserSettings />} />
          <Route path="/activity-log" element={<ActivityLog />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppShell>
    </AppDataProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <div className="wrap">
        <Routes>
          <Route path="/login" element={<LoginGate />} />
          <Route
            path="/*"
            element={
              <Protected>
                <Shell />
              </Protected>
            }
          />
        </Routes>
      </div>
    </AuthProvider>
  );
}

function LoginGate() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Login />;
}

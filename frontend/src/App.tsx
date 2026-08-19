import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Inventory from './pages/Inventory';
import Orders from './pages/Orders';
import Admin from './pages/Admin';
import Inbound from './pages/Inbound';
import Login from './pages/Login';
import ShiftBoardPage from './pages/ShiftBoardPage';
import SettingsModal from './components/SettingsModal';
import { SettingsProvider } from './context/SettingsContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserRole } from './types';

// Захищений компонент (Private Route)
const PrivateRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#08080f', color: '#e359ac' }}>LOADING KERNEL...</div>;
  }
  
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

const AdminRoute = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#08080f', color: '#e359ac' }}>LOADING KERNEL...</div>;
  }

  if (user?.role !== UserRole.ADMIN_MANAGER) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

const InboundRoute = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#08080f', color: '#e359ac' }}>LOADING KERNEL...</div>;
  }

  const allowed = user?.role === UserRole.ADMIN_MANAGER || user?.role === UserRole.INBOUND_OPERATOR;
  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

// Компоновка додатку (Sidebar + Main)
const MainLayout = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const location = useLocation();
  const currentTab = location.pathname.replace('/', '') || 'dashboard';

  return (
    <div className="app-layout">
      {/* Sidebar тепер сам керує навігацією через react-router */}
      <Sidebar 
        activeTab={currentTab} 
        onTabChange={(tab) => console.log('Tab changed to', tab)} 
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      <main className="main-content">
        <Outlet />
      </main>
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
};

export default function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Захищені роути */}
            <Route element={<PrivateRoute />}>
              <Route path="/shift/board" element={<ShiftBoardPage />} />
              <Route element={<MainLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route element={<AdminRoute />}>
                  <Route path="/employees" element={<Employees />} />
                  <Route path="/admin" element={<Admin />} />
                </Route>
                <Route path="/inventory" element={<Inventory />} />
                <Route element={<InboundRoute />}>
                  <Route path="/inbound" element={<Inbound />} />
                </Route>
                <Route path="/orders-waves" element={<Orders />} />
                <Route path="/analytics" element={<Dashboard />} />
                <Route path="/shift-reports" element={<ShiftBoardPage />} />
              </Route>
            </Route>

            {/* 404 Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </SettingsProvider>
  );
}

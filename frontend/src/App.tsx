import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Inventory from './pages/Inventory';
import Orders from './pages/Orders';
import Waves from './pages/Waves';
import Admin from './pages/Admin';
import Inbound from './pages/Inbound';
import Login from './pages/Login';
import ShiftBoardPage from './pages/ShiftBoardPage';
import ShiftReportsPage from './pages/ShiftReportsPage';
import ShiftReportEditorPage from './pages/ShiftReportEditorPage';
import MyShift from './pages/MyShift';
import SettingsModal from './components/SettingsModal';
import { SettingsProvider } from './context/SettingsContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserRole } from './types';
import { homePathForRole, isFloorRole } from './utils/homePath';

export { homePathForRole };

const AppLoading = () => {
  const { t } = useTranslation();
  return (
    <div className="app-loading">
      <div className="app-loading-spinner" aria-hidden />
      <span>{t('common.loading')}</span>
    </div>
  );
};

const PrivateRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <AppLoading />;
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

const AdminRoute = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <AppLoading />;
  if (user?.role !== UserRole.ADMIN_MANAGER) {
    return <Navigate to={homePathForRole(user?.role)} replace />;
  }
  return <Outlet />;
};

const InboundRoute = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <AppLoading />;
  const allowed = user?.role === UserRole.ADMIN_MANAGER || user?.role === UserRole.INBOUND_OPERATOR;
  if (!allowed) return <Navigate to={homePathForRole(user?.role)} replace />;
  return <Outlet />;
};

const MyShiftRoute = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <AppLoading />;
  if (!isFloorRole(user?.role)) {
    return <Navigate to={homePathForRole(user?.role)} replace />;
  }
  return <Outlet />;
};

const MainLayout = () => {
  const { t } = useTranslation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const currentTab = location.pathname.replace(/^\//, '') || 'dashboard';

  return (
    <div className="app-layout">
      <a href="#main-content" className="skip-link">
        {t('common.skipToContent')}
      </a>

      <button
        type="button"
        className="mobile-nav-toggle"
        aria-expanded={sidebarOpen}
        aria-label={sidebarOpen ? t('sidebar.closeMenu') : t('sidebar.openMenu')}
        onClick={() => setSidebarOpen((open) => !open)}
      >
        {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label={t('sidebar.closeMenu')}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        activeTab={currentTab}
        onTabChange={() => setSidebarOpen(false)}
        onOpenSettings={() => {
          setIsSettingsOpen(true);
          setSidebarOpen(false);
        }}
        isOpen={sidebarOpen}
        onNavigate={() => setSidebarOpen(false)}
      />

      <main id="main-content" className="main-content" tabIndex={-1} aria-label={t('common.mainContent')}>
        <Outlet />
      </main>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
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

            <Route element={<PrivateRoute />}>
              <Route element={<AdminRoute />}>
                <Route path="/shift/board" element={<ShiftBoardPage />} />
              </Route>
              <Route element={<MainLayout />}>
                <Route element={<AdminRoute />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/employees" element={<Employees />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/orders" element={<Orders />} />
                  <Route path="/waves" element={<Waves />} />
                  <Route path="/reports" element={<ShiftReportsPage />} />
                  <Route path="/reports/:shiftId" element={<ShiftReportEditorPage />} />
                </Route>
                <Route element={<MyShiftRoute />}>
                  <Route path="/my-shift" element={<MyShift />} />
                </Route>
                <Route element={<InboundRoute />}>
                  <Route path="/inbound" element={<Inbound />} />
                </Route>
              </Route>
              <Route path="/shift-reports" element={<Navigate to="/reports" replace />} />
              <Route path="/analytics" element={<Navigate to="/" replace />} />
              <Route path="/orders-waves" element={<Navigate to="/orders" replace />} />
              <Route path="/terminal" element={<Navigate to="/my-shift" replace />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </SettingsProvider>
  );
}

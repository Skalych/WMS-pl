import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '../api/services';
import { UserRole } from '../types';
import { isFloorRole } from '../utils/homePath';

export interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenSettings: () => void;
  isOpen?: boolean;
  onNavigate?: () => void;
}

const DashboardIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
  </svg>
);

const EmployeesIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const InventoryIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const OrdersIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

const WavesIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

const ShiftReportsIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const InboundIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const AdminIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

const SettingsIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const MyShiftIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const LogOutIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export default function Sidebar({ activeTab, onTabChange, onOpenSettings, isOpen = false, onNavigate }: SidebarProps) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSimulationActive, setIsSimulationActive] = useState(true);

  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);
    onNavigate?.();
    navigate(`/${tabId === 'dashboard' ? '' : tabId}`);
  };

  const handleToggleSimulation = async () => {
    const newState = !isSimulationActive;
    setIsSimulationActive(newState);
    try {
      await dashboardService.toggleSimulation(newState);
    } catch (e) {
      console.error('Failed to toggle simulation', e);
      setIsSimulationActive(!newState);
    }
  };

  const isAdmin = user?.role === UserRole.ADMIN_MANAGER;
  const isInbound =
    user?.role === UserRole.ADMIN_MANAGER || user?.role === UserRole.INBOUND_OPERATOR;
  const showMyShift = isFloorRole(user?.role) || isAdmin;

  const isTabActive = (itemId: string): boolean => {
    if (activeTab === itemId) return true;
    const lowerActive = activeTab.toLowerCase();
    const lowerItem = itemId.toLowerCase();
    if (lowerActive === lowerItem) return true;
    if (lowerItem === 'employees' && (lowerActive === 'workers' || lowerActive === 'people')) return true;
    if (lowerItem === 'shift-reports' && lowerActive === 'reports') return true;
    return false;
  };

  const navigationSections = [
    {
      label: t('sidebar.operations'),
      items: [
        ...(showMyShift
          ? [{ id: 'my-shift', label: t('sidebar.myShift'), Icon: MyShiftIcon }]
          : []),
        ...(isAdmin
          ? [
              { id: 'dashboard', label: t('sidebar.dashboard'), Icon: DashboardIcon },
              { id: 'admin', label: t('sidebar.simulation'), Icon: AdminIcon },
              { id: 'employees', label: t('sidebar.employees'), Icon: EmployeesIcon },
              { id: 'inventory', label: t('sidebar.inventory'), Icon: InventoryIcon },
              { id: 'orders', label: t('sidebar.orders'), Icon: OrdersIcon },
              { id: 'waves', label: t('sidebar.waves'), Icon: WavesIcon },
            ]
          : []),
        ...(isInbound ? [{ id: 'inbound', label: t('sidebar.inbound'), Icon: InboundIcon }] : []),
      ],
    },
    ...(isAdmin
      ? [
          {
            label: t('sidebar.reports'),
            items: [{ id: 'shift/board', label: t('sidebar.shiftBoard'), Icon: ShiftReportsIcon }],
          },
        ]
      : []),
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`} aria-label={t('sidebar.operations')}>
      <div className="sidebar-logo">
        <div className="logo-mark">W</div>
        <div>
          <div className="logo-text">WMS</div>
          <div className="logo-subtitle">{t('sidebar.brandSubtitle')}</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navigationSections
          .filter((section) => section.items.length > 0)
          .map((section) => (
          <div key={section.label} className="sidebar-section">
            <div className="sidebar-section-label">{section.label}</div>
            <ul className="nav-menu" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {section.items.map((item) => {
                const active = isTabActive(item.id);
                return (
                  <li
                    key={item.id}
                    className={`sidebar-nav-item ${active ? 'active' : ''}`}
                    onClick={() => handleTabClick(item.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleTabClick(item.id);
                      }
                    }}
                  >
                    <span className="nav-icon">
                      <item.Icon />
                    </span>
                    <span className="nav-label">{item.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="sidebar-bottom" style={{ marginTop: 'auto', paddingTop: '1rem' }}>
        {user?.role === UserRole.ADMIN_MANAGER && (
          <div className="sidebar-autopilot">
            <span className="sidebar-autopilot-label">
              <span className={`sidebar-autopilot-dot ${isSimulationActive ? 'on' : ''}`} />
              {t('sidebar.simulation')}
            </span>
            <button
              type="button"
              className={`sidebar-autopilot-btn ${isSimulationActive ? 'on' : ''}`}
              onClick={handleToggleSimulation}
              aria-pressed={isSimulationActive}
            >
              {isSimulationActive ? t('common.on') : t('common.off')}
            </button>
          </div>
        )}

        <div
          className="sidebar-nav-item"
          onClick={onOpenSettings}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenSettings();
            }
          }}
        >
          <SettingsIcon />
          <span>{t('sidebar.settings')}</span>
        </div>

        {user && (
          <div className="sidebar-user">
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user.fullName}</span>
              <span className="sidebar-user-email">{user.email}</span>
            </div>
            <button type="button" className="sidebar-logout" onClick={logout}>
              <LogOutIcon />
              {t('sidebar.logout')}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

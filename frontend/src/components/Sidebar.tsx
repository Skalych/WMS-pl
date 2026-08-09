import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import { useNavigate } from 'react-router-dom';

export interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenSettings: () => void;
}

// Simple inline SVG Icons (18x18)
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

const OrdersWavesIcon: React.FC = () => (
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
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const AnalyticsIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const MapIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
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

export default function Sidebar({ activeTab, onTabChange, onOpenSettings }: SidebarProps) {
  const { t } = useTranslation();
  const { language } = useSettings();
  const navigate = useNavigate();

  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);
    navigate(`/${tabId === 'dashboard' ? '' : tabId}`);
  };

  const isTabActive = (itemId: string): boolean => {
    if (activeTab === itemId) return true;
    const lowerActive = activeTab.toLowerCase();
    const lowerItem = itemId.toLowerCase();
    if (lowerActive === lowerItem) return true;
    if (lowerItem === 'employees' && (lowerActive === 'workers' || lowerActive === 'people')) return true;
    if (lowerItem === 'orders-waves' && (lowerActive === 'waves' || lowerActive === 'orders')) return true;
    if (lowerItem === 'shift-reports' && lowerActive === 'reports') return true;
    return false;
  };

  const navigationSections = [
    {
      label: t('sidebar.operations'),
      items: [
        { id: 'dashboard', label: t('sidebar.dashboard'), Icon: DashboardIcon },
        { id: 'admin', label: 'Sim Tools', Icon: AdminIcon },
        { id: 'employees', label: t('sidebar.employees'), Icon: EmployeesIcon },
        { id: 'inventory', label: t('sidebar.inventory'), Icon: InventoryIcon },
        { id: 'orders-waves', label: t('sidebar.ordersWaves'), Icon: OrdersWavesIcon },
      ],
    },
    {
      label: t('sidebar.reports'),
      items: [
        { id: 'shift-reports', label: t('sidebar.shiftReports'), Icon: ShiftReportsIcon },
        { id: 'analytics', label: t('sidebar.analytics'), Icon: AnalyticsIcon },
      ],
    },
  ];

  return (
    <aside className="sidebar">
      {/* Top Logo Section */}
      <div className="sidebar-logo logo-container">
        <div
          className="logo-mark"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #e359ac 0%, #c026d3 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '1.15rem',
            fontFamily: 'var(--font-mono, monospace)',
            boxShadow: '0 0 15px rgba(227, 89, 172, 0.4)',
            flexShrink: 0,
          }}
        >
          W
        </div>
        <div className="logo-text-wrapper" style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            className="logo-text"
            style={{
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '1.25rem',
              lineHeight: '1.1',
              letterSpacing: '-0.5px',
            }}
          >
            WMS
          </span>
          <span
            className="logo-subtitle"
            style={{
              color: 'var(--text-muted, #94a3b8)',
              fontSize: '0.75rem',
              fontWeight: 500,
              letterSpacing: '1px',
              textTransform: 'lowercase',
            }}
          >
            nexus
          </span>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
        {navigationSections.map((section) => (
          <div key={section.label} className="sidebar-section">
            <div
              className="sidebar-section-label"
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: 'var(--text-muted, #94a3b8)',
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
                marginBottom: '0.6rem',
                paddingLeft: '0.75rem',
                opacity: 0.8,
              }}
            >
              {section.label}
            </div>
            <ul className="nav-menu" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', listStyle: 'none', padding: 0, margin: 0 }}>
              {section.items.map((item) => {
                const active = isTabActive(item.id);
                return (
                  <li
                    key={item.id}
                    className={`sidebar-nav-item nav-item ${active ? 'active' : ''}`}
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
                    <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', opacity: active ? 1 : 0.75 }}>
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

      {/* Bottom Section */}
      <div className="sidebar-bottom" style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        <div 
          className="sidebar-nav-item" 
          onClick={onOpenSettings}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '10px 16px', cursor: 'pointer', color: 'var(--text-muted)' }}
        >
          <SettingsIcon />
          <span style={{ fontSize: '0.85rem' }}>{t('sidebar.settings')}</span>
        </div>

        <div
          className="sidebar-separator"
          style={{
            height: '1px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          }}
        />
        
        <div
          className="websocket-status"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.8rem',
            color: 'var(--text-muted, #94a3b8)',
            padding: '0 0.5rem',
          }}
        >
          <span>WebSocket</span>
          <span
            className="status-dot-green"
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 8px #10b981',
              display: 'inline-block',
            }}
          />
          <span style={{ color: '#10b981', fontWeight: 500 }}>{t('sidebar.connected')}</span>
        </div>
      </div>
    </aside>
  );
};


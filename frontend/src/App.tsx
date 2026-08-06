import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Inventory from './pages/Inventory';
import Orders from './pages/Orders';
import SettingsModal from './components/SettingsModal';
import { SettingsProvider } from './context/SettingsContext';

type TabId = 'dashboard' | 'employees' | 'inventory' | 'orders' | 'reports' | 'analytics';

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'employees':
        return <Employees />;
      case 'inventory':
        return <Inventory />;
      case 'orders':
        return <Orders />;
      case 'reports':
        return <Orders />;
      case 'analytics':
        return <Dashboard />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={(tab) => setActiveTab(tab as TabId)} 
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      <main className="main-content">
        {renderPage()}
      </main>
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}

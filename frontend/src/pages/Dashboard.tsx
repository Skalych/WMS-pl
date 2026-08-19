import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardService, orderService } from '../api/services';
import { DashboardStats, Wave } from '../types';
import { Clock, Activity, CheckCircle, Package, Users, Zap, TrendingUp, Layers } from 'lucide-react';
import ShiftPulseBoard from '../components/ShiftPulseBoard';
import { useShiftLive } from '../hooks/useShiftLive';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: shiftLive, connected } = useShiftLive();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeWaves, setActiveWaves] = useState<Wave[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchData = async (isPolling = false) => {
    try {
      if (!isPolling) setIsLoading(true);
      const [statsData, wavesData] = await Promise.all([
        dashboardService.getStats(),
        orderService.getWaves()
      ]);
      setStats(statsData);
      setActiveWaves(wavesData.filter(w => w.status !== 'COMPLETED' && w.status !== 'CANCELLED').slice(0, 4));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      if (!isPolling) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const dataInterval = setInterval(() => {
      fetchData(true);
    }, 5000);
    
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(dataInterval);
      clearInterval(clockInterval);
    };
  }, []);

  // Format datetime for cyberpunk clock
  const timeString = currentTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateString = currentTime.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

  // CSS based fake activity chart
  const fakeChartData = [30, 45, 60, 40, 80, 100, 75, 85, 50, 65, 45, 90, 70, 85];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      <ShiftPulseBoard data={shiftLive} connected={connected} />
      
      {/* 1. Header with Clock */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity className="text-accent" size={24} /> Dashboard
          </h1>
          <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
            System wide operations overview
          </p>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(15, 15, 22, 0.7)',
          padding: '8px 16px',
          borderRadius: '8px',
          border: '1px solid rgba(227, 89, 172, 0.2)',
          boxShadow: '0 0 15px rgba(227, 89, 172, 0.05)'
        }}>
          <Clock size={16} className="text-accent" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="text-mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{dateString}</span>
            <span className="text-mono text-accent" style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '1px' }}>{timeString}</span>
          </div>
        </div>
      </header>

      {/* 2. Top Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card" style={{ borderTop: '2px solid #22c55e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Orders Shipped</span>
            <CheckCircle size={16} color="#22c55e" />
          </div>
          <span className="stat-value">{isLoading ? '...' : stats?.ordersShippedToday || 0}</span>
          <div className="stat-change positive">
            <TrendingUp size={12} /> Today's throughput
          </div>
        </div>

        <div className="stat-card" style={{ borderTop: '2px solid var(--accent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Active Orders</span>
            <Zap size={16} className="text-accent" />
          </div>
          <span className="stat-value text-accent glow" style={{ textShadow: '0 0 10px rgba(227,89,172,0.5)' }}>
            {isLoading ? '...' : stats?.activeOrders || 0}
          </span>
          <div className="stat-change text-muted" style={{ marginTop: '8px', fontSize: '0.75rem' }}>
            Pending fulfillment
          </div>
        </div>

        <div className="stat-card" style={{ borderTop: '2px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Inbound Pending</span>
            <Package size={16} color="#f59e0b" />
          </div>
          <span className="stat-value">{isLoading ? '...' : stats?.inboundPending || 0}</span>
          <div className="stat-change text-muted" style={{ marginTop: '8px', fontSize: '0.75rem' }}>
            Awaiting putaway
          </div>
        </div>

        <div className="stat-card" style={{ borderTop: '2px solid #38bdf8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Workforce Online</span>
            <Users size={16} color="#38bdf8" />
          </div>
          <span className="stat-value">
            {isLoading ? '...' : `${stats?.employeesOnline || 0} / ${stats?.totalEmployees || 0}`}
          </span>
          <div className="stat-change" style={{ color: '#38bdf8', marginTop: '8px', fontSize: '0.75rem' }}>
            Active connections
          </div>
        </div>
      </div>

      {/* 3. Main Split Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.8fr 1.2fr',
        gap: '1.5rem',
        alignItems: 'start'
      }}>
        
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Live Waves */}
          <div className="data-panel">
            <div className="data-panel-header">
              <h3 className="data-panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} className="text-accent" /> Live Waves ({stats?.activeWaves || 0})
              </h3>
            </div>
            <div style={{ padding: '20px' }}>
              {isLoading ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading waves...</div>
              ) : activeWaves.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0' }}>
                  No active waves at the moment.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {activeWaves.map(wave => {
                    const isSorting = wave.status === 'SORTING' || wave.status === 'PACKING';
                    const barColor = isSorting ? 'cyan' : ''; 
                    
                    return (
                      <div key={wave.id} style={{ 
                        background: 'rgba(255,255,255,0.02)', 
                        padding: '16px', 
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <span className="text-mono" style={{ fontSize: '0.85rem', fontWeight: 600 }}>WAVE-{wave.id.substring(0, 8).toUpperCase()}</span>
                          <span className={`badge ${isSorting ? 'badge-info' : 'badge-accent'}`}>{wave.status}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                          <span>Orders: {wave.ordersCount || 0}</span>
                          <span>{wave.progress}%</span>
                        </div>
                        <div className="progress-bar">
                          <div className={`progress-bar-fill ${barColor}`} style={{ width: `${wave.progress}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Activity Chart (CSS) */}
          <div className="data-panel">
            <div className="data-panel-header">
              <h3 className="data-panel-title">System Throughput</h3>
            </div>
            <div style={{ padding: '24px 24px 16px', height: '180px', display: 'flex', alignItems: 'flex-end', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {fakeChartData.map((height, i) => (
                <div key={i} style={{
                  flex: 1,
                  height: `${height}%`,
                  background: `linear-gradient(to top, rgba(227,89,172,0.1), rgba(227,89,172,${height/100}))`,
                  borderRadius: '4px 4px 0 0',
                  borderTop: '2px solid var(--accent)',
                  transition: 'height 1s ease',
                  boxShadow: '0 -5px 15px rgba(227,89,172,0.2)'
                }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 24px', color: 'var(--text-muted)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
              <span>-60m</span>
              <span>-45m</span>
              <span>-30m</span>
              <span>-15m</span>
              <span>Now</span>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* System Health */}
          <div className="data-panel">
            <div className="data-panel-header">
              <h3 className="data-panel-title">System Health</h3>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              
              {/* Circular Progress (CSS based) */}
              <div style={{
                position: 'relative',
                width: '140px',
                height: '140px',
                borderRadius: '50%',
                background: `conic-gradient(#38bdf8 ${(stats?.inventoryAccuracy || 0)}%, rgba(255,255,255,0.05) 0)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(56,189,248,0.1)'
              }}>
                <div style={{
                  position: 'absolute',
                  width: '120px',
                  height: '120px',
                  background: 'var(--bg-card)',
                  borderRadius: '50%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span className="text-mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#38bdf8' }}>
                    {isLoading ? '...' : `${stats?.inventoryAccuracy || 0}%`}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Accuracy</span>
                </div>
              </div>

              <div style={{ width: '100%', marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span className="text-muted">Network Status</span>
                  <span className="badge badge-active" style={{ fontSize: '0.65rem' }}>ONLINE</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span className="text-muted">Database Sync</span>
                  <span className="badge badge-active" style={{ fontSize: '0.65rem' }}>SYNCED</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="data-panel">
            <div className="data-panel-header">
              <h3 className="data-panel-title">Quick Actions</h3>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button className="btn btn-primary" onClick={() => navigate('/orders')} style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                <Layers size={16} /> Manage Waves
              </button>
              <button className="btn btn-ghost" onClick={() => navigate('/inventory')} style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                <Package size={16} /> Check Inventory
              </button>
              <button className="btn btn-ghost" onClick={() => navigate('/employees')} style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                <Users size={16} /> View Workforce
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

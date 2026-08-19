import { useState, useEffect } from 'react';
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
        orderService.getWaves(),
      ]);
      setStats(statsData);
      setActiveWaves(wavesData.filter((w) => w.status !== 'COMPLETED' && w.status !== 'CANCELLED').slice(0, 4));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      if (!isPolling) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const dataInterval = setInterval(() => fetchData(true), 5000);
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      clearInterval(dataInterval);
      clearInterval(clockInterval);
    };
  }, []);

  const timeString = currentTime.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const dateString = currentTime.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="dashboard-page">
      <ShiftPulseBoard data={shiftLive} connected={connected} />

      <header className="dashboard-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity className="text-accent" size={22} />
            Operations overview
          </h1>
          <p className="page-subtitle">Warehouse status and active work</p>
        </div>

        <div className="clock-widget">
          <Clock size={16} className="text-accent" />
          <div>
            <div className="clock-widget-date">{dateString}</div>
            <div className="clock-widget-time">{timeString}</div>
          </div>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card" style={{ borderTop: '2px solid var(--color-success)' }}>
          <div className="flex-between">
            <span className="stat-label">Orders shipped today</span>
            <CheckCircle size={16} color="var(--color-success)" />
          </div>
          <span className="stat-value">{isLoading ? '…' : stats?.ordersShippedToday ?? 0}</span>
          <div className="stat-change positive">
            <TrendingUp size={12} />
            Daily throughput
          </div>
        </div>

        <div className="stat-card" style={{ borderTop: '2px solid var(--accent-primary)' }}>
          <div className="flex-between">
            <span className="stat-label">Active orders</span>
            <Zap size={16} className="text-accent" />
          </div>
          <span className="stat-value accent">{isLoading ? '…' : stats?.activeOrders ?? 0}</span>
          <div className="stat-change text-muted">Pending fulfillment</div>
        </div>

        <div className="stat-card" style={{ borderTop: '2px solid var(--color-warning)' }}>
          <div className="flex-between">
            <span className="stat-label">Inbound pending</span>
            <Package size={16} color="var(--color-warning)" />
          </div>
          <span className="stat-value">{isLoading ? '…' : stats?.inboundPending ?? 0}</span>
          <div className="stat-change text-muted">Awaiting putaway</div>
        </div>

        <div className="stat-card" style={{ borderTop: '2px solid var(--color-info)' }}>
          <div className="flex-between">
            <span className="stat-label">Workforce online</span>
            <Users size={16} color="var(--color-info)" />
          </div>
          <span className="stat-value">
            {isLoading ? '…' : `${stats?.employeesOnline ?? 0} / ${stats?.totalEmployees ?? 0}`}
          </span>
          <div className="stat-change text-muted">Active on floor</div>
        </div>
      </div>

      <div className="dashboard-split">
        <div className="data-panel">
          <div className="data-panel-header">
            <h3 className="data-panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} className="text-accent" />
              Active waves ({stats?.activeWaves ?? 0})
            </h3>
          </div>
          <div style={{ padding: '20px' }}>
            {isLoading ? (
              <p className="text-muted">Loading waves…</p>
            ) : activeWaves.length === 0 ? (
              <p className="text-muted" style={{ textAlign: 'center', padding: '20px 0' }}>
                No active waves
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activeWaves.map((wave) => {
                  const isSorting = wave.status === 'SORTING';
                  return (
                    <div key={wave.id} className="wave-row">
                      <div className="wave-row-header">
                        <span className="text-mono" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                          WAVE-{wave.id.substring(0, 8).toUpperCase()}
                        </span>
                        <span className={`badge ${isSorting ? 'badge-info' : 'badge-accent'}`}>{wave.status}</span>
                      </div>
                      <div
                        className="flex-between text-muted"
                        style={{ fontSize: '0.75rem', marginBottom: '6px' }}
                      >
                        <span>Orders: {wave.ordersCount ?? 0}</span>
                        <span>{wave.progress}%</span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className={`progress-bar-fill ${isSorting ? 'cyan' : ''}`}
                          style={{ width: `${wave.progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="data-panel">
          <div className="data-panel-header">
            <h3 className="data-panel-title">Quick actions</h3>
          </div>
          <div className="quick-actions">
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={() => navigate('/orders-waves')}
            >
              <Layers size={16} />
              Manage waves
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%' }}
              onClick={() => navigate('/inventory')}
            >
              <Package size={16} />
              Check inventory
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%' }}
              onClick={() => navigate('/employees')}
            >
              <Users size={16} />
              View team
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%' }}
              onClick={() => navigate('/shift/board')}
            >
              <Activity size={16} />
              Shift board
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%' }}
              onClick={() => navigate('/terminal')}
            >
              <Package size={16} />
              Pick terminal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

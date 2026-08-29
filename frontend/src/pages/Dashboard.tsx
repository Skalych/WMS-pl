import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { dashboardService, orderService } from '../api/services';
import { DashboardStats, Wave } from '../types';
import { Clock, Activity, CheckCircle, Package, Users, Zap, Layers } from 'lucide-react';
import ShiftPulseBoard from '../components/ShiftPulseBoard';
import { useShiftLive } from '../hooks/useShiftLive';
import { rowStaggerStyle } from '../utils/rowStagger';

export default function Dashboard() {
  const { t } = useTranslation();
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
            {t('dashboard.title')}
          </h1>
          <p className="page-subtitle">{t('dashboard.subtitle')}</p>
        </div>

        <div className="clock-widget">
          <Clock size={16} className="text-accent" />
          <div>
            <div className="clock-widget-date">{dateString}</div>
            <div className="clock-widget-time">{timeString}</div>
          </div>
        </div>
      </header>

      <div className="kpi-strip">
        <div className="kpi-strip-item">
          <div className="kpi-strip-head">
            <span className="kpi-strip-label">{t('dashboard.shippedToday')}</span>
            <CheckCircle size={16} color="var(--color-success)" />
          </div>
          <span className="kpi-strip-value">{isLoading ? '…' : stats?.ordersShippedToday ?? 0}</span>
          <div className="kpi-strip-hint">{t('dashboard.dailyThroughput')}</div>
        </div>

        <div className="kpi-strip-item">
          <div className="kpi-strip-head">
            <span className="kpi-strip-label">{t('dashboard.activeOrders')}</span>
            <Zap size={16} className="text-accent" />
          </div>
          <span className="kpi-strip-value accent">{isLoading ? '…' : stats?.activeOrders ?? 0}</span>
          <div className="kpi-strip-hint">{t('dashboard.pendingFulfillment')}</div>
        </div>

        <div className="kpi-strip-item">
          <div className="kpi-strip-head">
            <span className="kpi-strip-label">{t('dashboard.inboundPending')}</span>
            <Package size={16} color="var(--color-warning)" />
          </div>
          <span className="kpi-strip-value">{isLoading ? '…' : stats?.inboundPending ?? 0}</span>
          <div className="kpi-strip-hint">{t('dashboard.awaitingPutaway')}</div>
        </div>

        <div className="kpi-strip-item">
          <div className="kpi-strip-head">
            <span className="kpi-strip-label">{t('dashboard.workforceOnline')}</span>
            <Users size={16} color="var(--color-info)" />
          </div>
          <span className="kpi-strip-value">
            {isLoading ? '…' : `${stats?.employeesOnline ?? 0} / ${stats?.totalEmployees ?? 0}`}
          </span>
          <div className="kpi-strip-hint">{t('dashboard.activeOnFloor')}</div>
        </div>
      </div>

      <section className="page-section">
        <div className="page-section-header">
          <h3 className="page-section-title">
            <Layers size={18} className="text-accent" />
            {t('dashboard.activeWavesTitle', { count: stats?.activeWaves ?? 0 })}
          </h3>
        </div>
        {isLoading ? (
          <p className="text-muted">{t('dashboard.loadingWaves')}</p>
        ) : activeWaves.length === 0 ? (
          <p className="text-muted">{t('dashboard.noActiveWaves')}</p>
        ) : (
          <div className="data-list-wrap is-ready">
            {activeWaves.map((wave, rowIndex) => {
              const isSorting = wave.status === 'SORTING';
              return (
                <div key={wave.id} className="wave-row data-list-row" style={rowStaggerStyle(rowIndex)}>
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
                    <span>{t('dashboard.ordersCount', { count: wave.ordersCount ?? 0 })}</span>
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
      </section>
    </div>
  );
}

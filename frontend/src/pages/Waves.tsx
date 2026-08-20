import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity } from 'lucide-react';
import { orderService } from '../api/services';
import { Wave, WaveStatus } from '../types';

export default function Waves() {
  const { t } = useTranslation();
  const [waves, setWaves] = useState<Wave[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async (isPolling = false) => {
    try {
      if (!isPolling) setIsLoading(true);
      const wavesData = await orderService.getWaves();
      setWaves(wavesData);
    } catch (error) {
      console.error('Failed to fetch waves:', error);
    } finally {
      if (!isPolling) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Activity className="text-accent" size={24} />
            {t('orders.wavesTab')}
          </h1>
          <p className="page-subtitle">{t('orders.subtitle')}</p>
        </div>
      </header>

      <div className="wave-grid">
        {isLoading && waves.length === 0 ? (
          <div className="panel-empty">{t('orders.loadingWaves')}</div>
        ) : waves.length === 0 ? (
          <div className="panel-empty">{t('orders.noWaves')}</div>
        ) : (
          waves.map((wave) => {
            const isCompleted = wave.status === WaveStatus.COMPLETED;
            const isSorting = wave.status === WaveStatus.SORTING;
            const isActive =
              wave.status === WaveStatus.IN_PROGRESS ||
              wave.status === WaveStatus.RELEASED ||
              wave.status === WaveStatus.PICKED;

            let cardClass = 'wave-card';
            if (isCompleted) cardClass += ' wave-card--done';
            else if (isSorting) cardClass += ' wave-card--sorting';
            else if (isActive) cardClass += ' wave-card--active';

            return (
              <div key={wave.id} className={`data-panel ${cardClass}`}>
                <div className="wave-card-body">
                  <div className="wave-card-header">
                    <div>
                      <span className="wave-card-label">{t('orders.wave')}</span>
                      <h3 className="text-mono">WAVE-{wave.waveNumber}</h3>
                    </div>
                    <span
                      className={`badge ${
                        isCompleted
                          ? 'badge-active'
                          : isSorting
                            ? 'badge-info'
                            : isActive
                              ? 'badge-accent'
                              : 'badge-muted'
                      }`}
                    >
                      {wave.status}
                    </span>
                  </div>

                  <div className="wave-card-meta">
                    <div>
                      <span className="wave-card-meta-label">Orders</span>
                      <span className="wave-card-meta-value">{wave.ordersCount}</span>
                    </div>
                    <div>
                      <span className="wave-card-meta-label">Zone</span>
                      <span className="badge badge-muted">{wave.zone || 'Mixed'}</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex-between" style={{ fontSize: '0.8rem', marginBottom: 8 }}>
                      <span className="text-muted">{t('orders.progress')}</span>
                      <span className="text-mono">{wave.progress}%</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className={`progress-bar-fill ${isSorting ? 'cyan' : ''}`}
                        style={{
                          width: `${wave.progress}%`,
                          background: isCompleted ? 'var(--color-success)' : undefined,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity } from 'lucide-react';
import { orderService } from '../api/services';
import { Wave, WaveStatus } from '../types';
import { rowStaggerStyle } from '../utils/rowStagger';

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

  const badgeForStatus = (wave: Wave) => {
    const isCompleted = wave.status === WaveStatus.COMPLETED;
    const isSorting = wave.status === WaveStatus.SORTING;
    const isActive =
      wave.status === WaveStatus.IN_PROGRESS ||
      wave.status === WaveStatus.RELEASED ||
      wave.status === WaveStatus.PICKED;

    if (isCompleted) return 'badge-active';
    if (isSorting) return 'badge-info';
    if (isActive) return 'badge-accent';
    return 'badge-muted';
  };

  const rowClassForStatus = (wave: Wave) => {
    if (wave.status === WaveStatus.COMPLETED) return 'wave-status-row--done';
    return '';
  };

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

      {isLoading && waves.length === 0 ? (
        <div className="panel-empty">{t('orders.loadingWaves')}</div>
      ) : waves.length === 0 ? (
        <div className="panel-empty">{t('orders.noWaves')}</div>
      ) : (
        <div className={`flat-table-wrap data-table-wrap${waves.length > 0 ? ' is-ready' : ''}`}>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('orders.wave')}</th>
                  <th>Status</th>
                  <th>Orders</th>
                  <th>Zone</th>
                  <th>{t('orders.progress')}</th>
                </tr>
              </thead>
              <tbody className="data-list-wrap is-ready">
                {waves.map((wave, rowIndex) => {
                  const isCompleted = wave.status === WaveStatus.COMPLETED;
                  const isSorting = wave.status === WaveStatus.SORTING;

                  return (
                    <tr
                      key={wave.id}
                      className={`data-list-row ${rowClassForStatus(wave)}`}
                      style={rowStaggerStyle(rowIndex)}
                    >
                      <td className="text-mono" style={{ fontWeight: 600 }}>
                        WAVE-{wave.waveNumber}
                      </td>
                      <td>
                        <span className={`badge ${badgeForStatus(wave)}`}>{wave.status}</span>
                      </td>
                      <td>{wave.ordersCount}</td>
                      <td>
                        <span className="badge badge-muted">{wave.zone || 'Mixed'}</span>
                      </td>
                      <td className="wave-progress-cell">
                        <div className="flex-between text-muted" style={{ fontSize: '0.75rem', marginBottom: 6 }}>
                          <span>{wave.progress}%</span>
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

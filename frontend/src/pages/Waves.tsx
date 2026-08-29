import { useState, useEffect, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, ChevronDown, ChevronRight } from 'lucide-react';
import { orderService } from '../api/services';
import { Wave, WaveStatus } from '../types';
import { rowStaggerStyle } from '../utils/rowStagger';

function microTaskBadgeClass(status: string): string {
  if (status === 'COMPLETED') return 'badge-active';
  if (status === 'IN_PROGRESS' || status === 'ASSIGNED') return 'badge-accent';
  return 'badge-muted';
}

export default function Waves() {
  const { t } = useTranslation();
  const [waves, setWaves] = useState<Wave[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedWaveId, setExpandedWaveId] = useState<string | null>(null);

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

  const toggleWave = (waveId: string) => {
    setExpandedWaveId((prev) => (prev === waveId ? null : waveId));
  };

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
                  <th style={{ width: 36 }} />
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
                  const isExpanded = expandedWaveId === wave.id;
                  const hasMicroTasks = wave.microTasksTotal > 0;

                  return (
                    <Fragment key={wave.id}>
                      <tr
                        className={`data-list-row wave-row-clickable ${rowClassForStatus(wave)}${isExpanded ? ' wave-row-expanded' : ''}`}
                        style={rowStaggerStyle(rowIndex)}
                        onClick={() => toggleWave(wave.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleWave(wave.id);
                          }
                        }}
                        aria-expanded={isExpanded}
                      >
                        <td className="wave-expand-cell">
                          {hasMicroTasks ? (
                            isExpanded ? (
                              <ChevronDown size={16} className="text-muted" />
                            ) : (
                              <ChevronRight size={16} className="text-muted" />
                            )
                          ) : null}
                        </td>
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
                            {hasMicroTasks && (
                              <span className="wave-micro-count">
                                {t('orders.microTasksCount', {
                                  done: wave.microTasksCompleted,
                                  total: wave.microTasksTotal,
                                })}
                              </span>
                            )}
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
                      {isExpanded && hasMicroTasks && (
                        <tr className="wave-microtasks-row">
                          <td colSpan={6}>
                            <div className="wave-microtasks-panel">
                              <div className="wave-microtasks-header">
                                {t('orders.microTasksTitle', { count: wave.microTasksTotal })}
                              </div>
                              <ul className="wave-microtasks-list">
                                {wave.microTasks.map((task) => {
                                  const isTaskActive =
                                    task.status === 'IN_PROGRESS' || task.status === 'ASSIGNED';
                                  const isTaskDone = task.status === 'COMPLETED';

                                  return (
                                    <li
                                      key={task.id}
                                      className={`wave-microtask-item${isTaskDone ? ' wave-microtask-item--done' : ''}${isTaskActive ? ' wave-microtask-item--active' : ''}`}
                                    >
                                      <div className="wave-microtask-main">
                                        <span className="text-mono wave-microtask-number">
                                          {task.taskNumber}
                                        </span>
                                        <span className={`badge ${microTaskBadgeClass(task.status)}`}>
                                          {task.status}
                                        </span>
                                        {task.assignedUserName && (
                                          <span className="wave-microtask-picker text-muted">
                                            {task.assignedUserName}
                                          </span>
                                        )}
                                        <span className="wave-microtask-meta text-muted">
                                          {t('orders.microTaskLines', { count: task.itemsCount })}
                                        </span>
                                      </div>
                                      <div className="wave-microtask-progress">
                                        {isTaskActive || (task.progress > 0 && !isTaskDone) ? (
                                          <>
                                            <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                                              {Math.round(task.progress)}%
                                            </span>
                                            <div className="progress-bar wave-microtask-bar">
                                              <div
                                                className="progress-bar-fill"
                                                style={{ width: `${task.progress}%` }}
                                              />
                                            </div>
                                          </>
                                        ) : isTaskDone ? (
                                          <span className="badge badge-active">{t('orders.microTaskDone')}</span>
                                        ) : (
                                          <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                                            {t('orders.microTaskWaiting')}
                                          </span>
                                        )}
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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

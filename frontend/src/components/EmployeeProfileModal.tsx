import { useState, useEffect } from 'react';
import { userService } from '../api/services';
import { X, Clock, Activity, Play, Coffee, AlertTriangle } from 'lucide-react';
import { BreakSession, Shift } from '../types';

interface ProfileEmployee {
  id: string;
  fullName?: string;
  name?: string;
  role: string;
  status: string;
}

interface Props {
  employee: ProfileEmployee | null;
  onClose: () => void;
}

export default function EmployeeProfileModal({ employee, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [pastShifts, setPastShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [localStatus, setLocalStatus] = useState(employee?.status || 'OFFLINE');

  useEffect(() => {
    if (employee) {
      setLocalStatus(employee.status);
      fetchData();
    }
  }, [employee]);

  const fetchData = async () => {
    if (!employee) return;
    setLoading(true);
    try {
      const [current, history] = await Promise.all([
        userService.getCurrentShift(employee.id).catch(() => null),
        userService.getPastShifts(employee.id).catch(() => [])
      ]);
      setCurrentShift(current);
      setPastShifts(history);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStartBreak = async () => {
    if (!employee) return;
    setActionLoading(true);
    try {
      await userService.startBreak(employee.id);
      setLocalStatus('BREAK');
      await fetchData();
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndBreak = async () => {
    if (!employee) return;
    setActionLoading(true);
    try {
      await userService.endBreak(employee.id);
      setLocalStatus('IDLE');
      await fetchData();
    } finally {
      setActionLoading(false);
    }
  };

  const formatDuration = (start: string, end: string | null) => {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const diffMins = Math.floor((endTime - startTime) / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  const formatBreakDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h}h ${m}m`;
    }
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  const renderBreakSummary = (summary: Shift['break_summary']) => (
    <div className="data-panel">
      <div className="data-panel-header">
        <h3 className="data-panel-title">
          <Coffee size={16} className="text-warning" />
          Break log
          {summary.overLimit && (
            <span className="badge badge-warning" style={{ marginLeft: 8 }}>
              <AlertTriangle size={12} style={{ marginRight: 4 }} />
              Over limit (23 min)
            </span>
          )}
        </h3>
        <span className="text-muted" style={{ fontSize: '0.875rem' }}>
          {summary.breakCount} breaks · {summary.breakMinutes} min total
        </span>
      </div>
      <div className="data-panel-body">
        {summary.sessions.length > 0 ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Start</th>
                  <th>End</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {summary.sessions.map((session: BreakSession, idx) => (
                  <tr key={`${session.startedAt}-${idx}`}>
                    <td className="text-mono">{new Date(session.startedAt).toLocaleTimeString()}</td>
                    <td className="text-mono">
                      {session.endedAt
                        ? new Date(session.endedAt).toLocaleTimeString()
                        : '— ongoing'}
                    </td>
                    <td className="text-mono">{formatBreakDuration(session.durationSeconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="panel-empty">No breaks recorded.</div>
        )}
      </div>
    </div>
  );

  if (!employee) return null;

  const displayName = employee.fullName || employee.name || 'Unknown';
  const avatarClass =
    localStatus === 'OFFLINE' ? 'modal-avatar--offline' :
    localStatus === 'BREAK' ? 'modal-avatar--break' :
    'modal-avatar--active';
  const statusColorClass =
    localStatus === 'BREAK' ? 'text-warning' :
    localStatus === 'OFFLINE' ? 'text-muted' :
    'text-success';

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div className="header-actions">
            <div className={`modal-avatar ${avatarClass}`}>
              {displayName.charAt(0)}
            </div>
            <div>
              <h2 className="page-title" style={{ fontSize: '1.25rem', margin: 0 }}>{displayName}</h2>
              <div className="modal-profile-meta">
                <span className="modal-role-tag">{employee.role}</span>
                <span>•</span>
                <span className={`header-actions ${statusColorClass}`}>
                  <span
                    className="modal-status-dot"
                    style={{
                      background:
                        localStatus === 'BREAK' ? 'var(--color-warning)' :
                        localStatus === 'OFFLINE' ? 'var(--text-muted)' :
                        'var(--color-success)'
                    }}
                  />
                  {localStatus}
                </span>
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="close-button">
            <X size={24} />
          </button>
        </div>

        <div className="modal-tabs">
          <div
            className={`modal-tab ${activeTab === 'current' ? 'active' : ''}`}
            onClick={() => setActiveTab('current')}
          >
            Current Shift
          </div>
          <div
            className={`modal-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Shift History
          </div>
        </div>

        <div className="modal-body custom-scrollbar">
          {loading ? (
            <div className="panel-empty">
              <Activity className="spin" size={32} />
            </div>
          ) : activeTab === 'current' ? (
            <div className="modal-stack">
              {currentShift ? (
                <>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-label">Shift Duration</div>
                      <div className="stat-value">{formatDuration(currentShift.start_time, null)}</div>
                      <div className="stat-card-footnote">
                        Started: {new Date(currentShift.start_time).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Total Volume (m³)</div>
                      <div className="stat-value accent">{(currentShift.total_volume_cm3 / 1000000).toFixed(4)}</div>
                      <div className="stat-card-footnote">{currentShift.total_items_picked} items picked</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Orders Completed</div>
                      <div className="stat-value text-info">{currentShift.total_orders_completed}</div>
                      <div className="stat-card-footnote">{currentShift.total_tasks_completed} tasks done</div>
                    </div>
                  </div>

                  <div className="modal-actions">
                    <button
                      type="button"
                      onClick={handleStartBreak}
                      className="btn btn-warning"
                      disabled={actionLoading || localStatus === 'BREAK'}
                    >
                      <Coffee size={16} />
                      {actionLoading && localStatus !== 'BREAK' ? 'Wait…' : 'Start break'}
                    </button>
                    <button
                      type="button"
                      onClick={handleEndBreak}
                      className="btn btn-success-solid"
                      disabled={actionLoading || localStatus !== 'BREAK'}
                    >
                      <Play size={16} />
                      {actionLoading && localStatus === 'BREAK' ? 'Wait…' : 'End break / resume'}
                    </button>
                  </div>

                  {renderBreakSummary(currentShift.break_summary)}

                  <div className="data-panel">
                    <div className="data-panel-header">
                      <h3 className="data-panel-title">
                        <Clock size={16} className="text-accent" />
                        Event Timeline
                      </h3>
                    </div>
                    <div className="data-panel-body">
                      {currentShift.events && currentShift.events.length > 0 ? (
                        <div className="timeline-list">
                          {currentShift.events
                            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                            .map((event, idx) => (
                              <div key={event.id} className="timeline-item">
                                <div className="timeline-marker-col">
                                  <div
                                    className={`timeline-dot ${
                                      event.event_type.includes('BREAK') ? 'timeline-dot--warning' :
                                      event.event_type.includes('LOGIN') ? 'timeline-dot--success' :
                                      'timeline-dot--info'
                                    }`}
                                  />
                                  {idx !== currentShift.events!.length - 1 && (
                                    <div className="timeline-line" />
                                  )}
                                </div>
                                <div className="timeline-content">
                                  <div className="timeline-event">{event.event_type}</div>
                                  <div className="timeline-time">{new Date(event.timestamp).toLocaleString()}</div>
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="panel-empty">No events recorded yet.</div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="panel-empty">
                  <div>No active shift found.</div>
                  <div className="text-muted" style={{ fontSize: '0.875rem', marginTop: '8px' }}>
                    Employee is currently offline or not checked in.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="data-panel">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Duration</th>
                      <th>Breaks</th>
                      <th>Items</th>
                      <th>Volume (m³)</th>
                      <th>Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastShifts.length > 0 ? pastShifts.map(shift => (
                      <tr key={shift.id}>
                        <td>
                          {new Date(shift.start_time).toLocaleDateString()}
                          <div className="text-muted text-mono" style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                            {new Date(shift.start_time).toLocaleTimeString()} – {shift.end_time ? new Date(shift.end_time).toLocaleTimeString() : 'Unknown'}
                          </div>
                        </td>
                        <td className="text-mono">{formatDuration(shift.start_time, shift.end_time)}</td>
                        <td className="text-mono">
                          {shift.break_summary.breakCount} · {shift.break_summary.breakMinutes}m
                          {shift.break_summary.overLimit && (
                            <AlertTriangle
                              size={14}
                              className="text-warning"
                              style={{ marginLeft: 6, verticalAlign: 'middle' }}
                              aria-label="Over break limit"
                            />
                          )}
                        </td>
                        <td>{shift.total_items_picked}</td>
                        <td className="text-accent text-mono">{(shift.total_volume_cm3 / 1000000).toFixed(4)}</td>
                        <td className="text-info text-mono">{shift.total_orders_completed}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="panel-empty">No past shifts found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

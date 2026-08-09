import React, { useState, useEffect } from 'react';
import { userService } from '../api/services';
import { X, Clock, Calendar, CheckCircle, Activity, Play, Square, Coffee } from 'lucide-react';
import { Employee, Shift, ShiftEventType } from '../types';

interface Props {
  employee: Employee | null;
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

  if (!employee) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 'bold',
              ...(employee.status === 'OFFLINE' ? { backgroundColor: '#1f2937', color: '#9ca3af' } :
                  employee.status === 'BREAK' ? { backgroundColor: 'rgba(245,158,11,0.2)', color: '#f59e0b' } :
                  { backgroundColor: 'rgba(227,89,172,0.2)', color: '#e359ac' })
            }}>
              {employee.fullName.charAt(0)}
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 }}>{employee.fullName}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.75rem' }}>
                  {employee.role}
                </span>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px',
                  color: localStatus === 'BREAK' ? 'var(--color-warning)' :
                         localStatus === 'OFFLINE' ? 'var(--text-muted)' :
                         'var(--color-success)'
                }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%',
                    backgroundColor: localStatus === 'BREAK' ? 'var(--color-warning)' :
                                     localStatus === 'OFFLINE' ? 'var(--text-muted)' :
                                     'var(--color-success)'
                  }}></span>
                  {localStatus}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="close-button">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs px-6" style={{ paddingLeft: '24px', paddingRight: '24px' }}>
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

        {/* Content */}
        <div className="modal-body custom-scrollbar">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              <Activity className="animate-pulse" size={32} style={{ animation: 'pulse 2s infinite' }} />
            </div>
          ) : activeTab === 'current' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {currentShift ? (
                <>
                  <div className="stats-grid" style={{ marginBottom: 0 }}>
                    <div className="stat-card">
                      <div className="stat-label">Shift Duration</div>
                      <div className="stat-value mt-2">{formatDuration(currentShift.start_time, null)}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>Started: {new Date(currentShift.start_time).toLocaleTimeString()}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Total Volume (m³)</div>
                      <div className="stat-value accent mt-2">{(currentShift.total_volume_cm3 / 1000000).toFixed(4)}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>{currentShift.total_items_picked} items picked</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Orders Completed</div>
                      <div className="stat-value mt-2" style={{ color: 'var(--color-info)' }}>{currentShift.total_orders_completed}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>{currentShift.total_tasks_completed} tasks done</div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button 
                      onClick={handleStartBreak}
                      className="btn btn-primary"
                      disabled={actionLoading || localStatus === 'BREAK'}
                      style={{ 
                        backgroundColor: '#f59e0b', 
                        color: '#000', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        border: 'none',
                        opacity: (actionLoading || localStatus === 'BREAK') ? 0.5 : 1
                      }}
                    >
                      <Coffee size={16} /> {actionLoading && localStatus !== 'BREAK' ? 'Wait...' : 'START BREAK'}
                    </button>
                    <button 
                      onClick={handleEndBreak}
                      className="btn btn-primary"
                      disabled={actionLoading || localStatus !== 'BREAK'}
                      style={{ 
                        backgroundColor: '#22c55e', 
                        color: '#000', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        border: 'none',
                        opacity: (actionLoading || localStatus !== 'BREAK') ? 0.5 : 1
                      }}
                    >
                      <Play size={16} /> {actionLoading && localStatus === 'BREAK' ? 'Wait...' : 'END BREAK / RESUME'}
                    </button>
                  </div>

                  <div className="data-panel">
                    <div className="data-panel-header">
                      <h3 className="data-panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={16} style={{ color: 'var(--accent-primary)' }} />
                        Event Timeline
                      </h3>
                    </div>
                    <div style={{ padding: '16px' }}>
                      {currentShift.events && currentShift.events.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {currentShift.events.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((event, idx) => (
                            <div key={event.id} style={{ display: 'flex', gap: '16px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{
                                  width: '12px', height: '12px', borderRadius: '50%',
                                  backgroundColor: event.event_type.includes('BREAK') ? 'var(--color-warning)' :
                                                   event.event_type.includes('LOGIN') ? 'var(--color-success)' :
                                                   'var(--color-info)'
                                }} />
                                {idx !== currentShift.events!.length - 1 && (
                                  <div style={{ width: '2px', height: '100%', backgroundColor: 'rgba(255,255,255,0.1)', marginTop: '4px' }} />
                                )}
                              </div>
                              <div style={{ paddingBottom: '16px' }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>{event.event_type}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{new Date(event.timestamp).toLocaleString()}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '16px 0' }}>No events recorded yet.</div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '48px 0' }}>
                  <div style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>No active shift found.</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', opacity: 0.8 }}>Employee is currently offline or not checked in.</div>
                </div>
              )}
            </div>
          ) : (
            <div className="data-panel">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Duration</th>
                    <th>Items</th>
                    <th>Volume (m³)</th>
                    <th>Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {pastShifts.length > 0 ? pastShifts.map(shift => (
                    <tr key={shift.id}>
                      <td style={{ color: 'rgba(255,255,255,0.8)' }}>
                        {new Date(shift.start_time).toLocaleDateString()}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {new Date(shift.start_time).toLocaleTimeString()} - {shift.end_time ? new Date(shift.end_time).toLocaleTimeString() : 'Unknown'}
                        </div>
                      </td>
                      <td style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>{formatDuration(shift.start_time, shift.end_time)}</td>
                      <td style={{ color: 'rgba(255,255,255,0.8)' }}>{shift.total_items_picked}</td>
                      <td style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>{(shift.total_volume_cm3 / 1000000).toFixed(4)}</td>
                      <td style={{ color: 'var(--color-info)', fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>{shift.total_orders_completed}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0' }}>No past shifts found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

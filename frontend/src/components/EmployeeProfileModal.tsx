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

  useEffect(() => {
    if (employee) {
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
    await userService.startBreak(employee.id);
    fetchData();
  };

  const handleEndBreak = async () => {
    if (!employee) return;
    await userService.endBreak(employee.id);
    fetchData();
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f0f16] border border-[rgba(255,255,255,0.08)] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
              employee.status === 'OFFLINE' ? 'bg-gray-800 text-gray-400' :
              employee.status === 'BREAK' ? 'bg-amber-500/20 text-amber-500' :
              'bg-[#e359ac]/20 text-[#e359ac]'
            }`}>
              {employee.fullName.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{employee.fullName}</h2>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-xs">
                  {employee.role}
                </span>
                <span>•</span>
                <span className={`flex items-center gap-1.5 ${
                  employee.status === 'BREAK' ? 'text-amber-400' :
                  employee.status === 'OFFLINE' ? 'text-gray-500' :
                  'text-green-400'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    employee.status === 'BREAK' ? 'bg-amber-400' :
                    employee.status === 'OFFLINE' ? 'bg-gray-500' :
                    'bg-green-400'
                  }`}></span>
                  {employee.status}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[rgba(255,255,255,0.06)] px-6">
          <button
            className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'current' ? 'border-[#e359ac] text-[#e359ac]' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
            onClick={() => setActiveTab('current')}
          >
            Current Shift
          </button>
          <button
            className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'history' ? 'border-[#e359ac] text-[#e359ac]' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
            onClick={() => setActiveTab('history')}
          >
            Shift History
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="flex justify-center items-center py-20 text-gray-400">
              <Activity className="animate-pulse" size={32} />
            </div>
          ) : activeTab === 'current' ? (
            <div className="space-y-6">
              {currentShift ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="stat-card">
                      <div className="stat-label">Shift Duration</div>
                      <div className="stat-value mt-2">{formatDuration(currentShift.start_time, null)}</div>
                      <div className="text-xs text-gray-500 mt-2">Started: {new Date(currentShift.start_time).toLocaleTimeString()}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Total Volume (m³)</div>
                      <div className="stat-value accent mt-2">{(currentShift.total_volume_cm3 / 1000000).toFixed(4)}</div>
                      <div className="text-xs text-gray-500 mt-2">{currentShift.total_items_picked} items picked</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Orders Completed</div>
                      <div className="stat-value mt-2 text-[#38bdf8]">{currentShift.total_orders_completed}</div>
                      <div className="text-xs text-gray-500 mt-2">{currentShift.total_tasks_completed} tasks done</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 mt-4">
                    <button 
                      onClick={handleStartBreak}
                      className="btn bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 flex items-center gap-2"
                    >
                      <Coffee size={16} /> Start Break
                    </button>
                    <button 
                      onClick={handleEndBreak}
                      className="btn bg-green-500/20 text-green-400 hover:bg-green-500/30 flex items-center gap-2"
                    >
                      <Play size={16} /> End Break / Resume
                    </button>
                  </div>

                  <div className="data-panel mt-6">
                    <div className="data-panel-header">
                      <h3 className="data-panel-title flex items-center gap-2">
                        <Clock size={16} className="text-[#e359ac]" />
                        Event Timeline
                      </h3>
                    </div>
                    <div className="p-4">
                      {currentShift.events && currentShift.events.length > 0 ? (
                        <div className="space-y-4">
                          {currentShift.events.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((event, idx) => (
                            <div key={event.id} className="flex gap-4">
                              <div className="flex flex-col items-center">
                                <div className={`w-3 h-3 rounded-full ${
                                  event.event_type.includes('BREAK') ? 'bg-amber-400' :
                                  event.event_type.includes('LOGIN') ? 'bg-green-400' :
                                  'bg-blue-400'
                                }`} />
                                {idx !== currentShift.events!.length - 1 && (
                                  <div className="w-0.5 h-full bg-white/10 mt-1" />
                                )}
                              </div>
                              <div className="pb-4">
                                <div className="text-sm font-medium text-white">{event.event_type}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{new Date(event.timestamp).toLocaleString()}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-500 text-sm text-center py-4">No events recorded yet.</div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-500 mb-2">No active shift found.</div>
                  <div className="text-sm text-gray-600">Employee is currently offline or not checked in.</div>
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
                      <td className="text-gray-300">
                        {new Date(shift.start_time).toLocaleDateString()}
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(shift.start_time).toLocaleTimeString()} - {shift.end_time ? new Date(shift.end_time).toLocaleTimeString() : 'Unknown'}
                        </div>
                      </td>
                      <td className="text-gray-300 font-mono text-sm">{formatDuration(shift.start_time, shift.end_time)}</td>
                      <td className="text-gray-300">{shift.total_items_picked}</td>
                      <td className="text-[#e359ac] font-mono text-sm">{(shift.total_volume_cm3 / 1000000).toFixed(4)}</td>
                      <td className="text-[#38bdf8] font-mono text-sm">{shift.total_orders_completed}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="text-center text-gray-500 py-8">No past shifts found.</td>
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

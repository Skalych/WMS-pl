import React, { useState, useEffect } from 'react';
import { userService } from '../api/services';
import { 
  Users, 
  Activity, 
  Coffee, 
  UserX, 
  ArrowUpDown,
  Radio,
  Clock,
  MapPin,
  CheckCircle2
} from 'lucide-react';

export interface Employee {
  id: string;
  name: string;
  role: 'PICKER' | 'INBOUND_OPERATOR' | 'PACKER_DISPATCHER';
  status: 'PICKING' | 'PUTAWAY' | 'SORTING' | 'RECEIVING' | 'DISPATCHING' | 'BREAK' | 'IDLE';
  dotClass: 'dot-online' | 'dot-busy' | 'dot-offline';
  badgeClass: string;
  wave: string;
  currentProgress: number | null;
  totalProgress: number | null;
  location: string;
  shiftTime: string;
  totalPicked: number;
  efficiency: number;
}

// Дані тепер підвантажуються з бекенду

type FilterType = 'All' | 'Active' | 'On Break';
type SortKey = 'status' | 'name' | 'progress' | 'totalPicked';

export default function Employees() {
  const [filter, setFilter] = useState<FilterType>('All');
  const [sortBy, setSortBy] = useState<SortKey>('status');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await userService.getEmployees();
        // Прив'язуємо UI стилі для даних з бекенду
        const mappedData = data.map((emp: any) => {
          let dotClass = 'dot-offline';
          let badgeClass = 'badge-muted';
          if (['PICKING', 'RECEIVING'].includes(emp.status)) { dotClass = 'dot-online'; badgeClass = 'badge-success'; }
          else if (['PUTAWAY', 'SORTING', 'DISPATCHING'].includes(emp.status)) { dotClass = 'dot-busy'; badgeClass = 'badge-warning'; }
          
          return {
            ...emp,
            name: emp.fullName, // Адаптація під існуючий UI компонент
            dotClass,
            badgeClass,
            wave: emp.currentWaveNumber || '—',
            currentProgress: emp.pickingProgress > 0 ? emp.pickingProgress : null,
            totalProgress: emp.pickingProgress > 0 ? 100 : null,
            location: emp.currentLocation,
            efficiency: emp.efficiency || 1.0
          };
        });
        setEmployees(mappedData);
      } catch (error) {
        console.error('Failed to fetch employees:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  const handleUpdateWorker = async (id: string, updates: any) => {
    try {
      await userService.updateEmployee(id, updates);
      setEmployees(prev => prev.map(e => {
        if (e.id === id) {
          const newStatus = updates.status || e.status;
          let dotClass = 'dot-offline';
          let badgeClass = 'badge-muted';
          if (['PICKING', 'RECEIVING'].includes(newStatus)) { dotClass = 'dot-online'; badgeClass = 'badge-success'; }
          else if (['PUTAWAY', 'SORTING', 'DISPATCHING'].includes(newStatus)) { dotClass = 'dot-busy'; badgeClass = 'badge-warning'; }
          
          return { ...e, ...updates, dotClass, badgeClass, status: newStatus };
        }
        return e;
      }));
    } catch (error) {
      console.error('Failed to update employee', error);
    }
  };

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    if (filter === 'Active') {
      return ['PICKING', 'PUTAWAY', 'SORTING', 'RECEIVING', 'DISPATCHING'].includes(emp.status);
    }
    if (filter === 'On Break') {
      return ['BREAK', 'IDLE', 'OFFLINE'].includes(emp.status);
    }
    return true;
  });

  // Sort employees
  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === 'totalPicked') {
      return b.totalPicked - a.totalPicked;
    }
    if (sortBy === 'progress') {
      const pctA = a.totalProgress ? (a.currentProgress! / a.totalProgress) : 0;
      const pctB = b.totalProgress ? (b.currentProgress! / b.totalProgress) : 0;
      return pctB - pctA;
    }
    // Default: sort by status weight / priority
    const statusOrder: Record<string, number> = {
      PICKING: 1,
      RECEIVING: 2,
      SORTING: 3,
      PUTAWAY: 4,
      DISPATCHING: 5,
      BREAK: 6,
      IDLE: 7
    };
    return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* 1. Page Header */}
      <header className="top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ color: 'var(--text-main)', fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
            Employees
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Real-time worker monitoring
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* LIVE Badge */}
          <div 
            className="badge" 
            style={{ 
              background: 'rgba(34, 197, 94, 0.12)', 
              color: '#22c55e', 
              border: '1px solid rgba(34, 197, 94, 0.3)',
              padding: '0.4rem 0.8rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8rem',
              letterSpacing: '0.5px'
            }}
          >
            <span className="dot-pulse" />
            <span>LIVE</span>
          </div>

          {/* Filter buttons */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['All', 'Active', 'On Break'] as FilterType[]).map((f) => (
              <button
                key={f}
                className={`btn-ghost ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
                style={filter === f ? { borderColor: '#e359ac', color: '#e359ac', backgroundColor: 'rgba(227, 89, 172, 0.12)' } : {}}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 2. Stats Row (4 Small Stat Cards) */}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        {/* Stat Card 1: Online */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title">Online</span>
            <Users size={18} style={{ color: '#22c55e' }} />
          </div>
          <div className="card-value" style={{ color: '#22c55e' }}>
            {isLoading ? '...' : employees.filter(e => e.status !== 'OFFLINE' && e.status !== 'IDLE').length}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span className="dot dot-online" /> Active warehouse staff
          </div>
        </div>

        {/* Stat Card 2: Active Tasks */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title">Active Tasks</span>
            <Activity size={18} style={{ color: '#e359ac' }} />
          </div>
          <div className="card-value" style={{ color: '#e359ac' }}>
            {isLoading ? '...' : employees.filter(e => ['PICKING', 'PUTAWAY', 'SORTING', 'RECEIVING', 'DISPATCHING'].includes(e.status)).length}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span className="dot dot-busy" /> Picking, putaway, sorting
          </div>
        </div>

        {/* Stat Card 3: On Break */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title">On Break</span>
            <Coffee size={18} style={{ color: '#f59e0b' }} />
          </div>
          <div className="card-value" style={{ color: '#f59e0b' }}>
            {isLoading ? '...' : employees.filter(e => e.status === 'BREAK').length}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span className="dot dot-busy" /> Scheduled rest period
          </div>
        </div>

        {/* Stat Card 4: Offline */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title">Offline</span>
            <UserX size={18} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="card-value" style={{ color: 'var(--text-muted)' }}>
            {isLoading ? '...' : employees.filter(e => e.status === 'OFFLINE' || e.status === 'IDLE').length}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span className="dot dot-offline" /> Off-shift / Idle workers
          </div>
        </div>
      </div>

      {/* 3. Main Data Table in a .data-panel */}
      <div className="data-panel">
        {/* Panel Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Radio size={18} style={{ color: '#e359ac' }} />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              Worker Status Feed
            </h2>
          </div>

          {/* Sort Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <ArrowUpDown size={14} /> Sort:
            </span>
            <select
              className="btn-ghost"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              style={{ 
                cursor: 'pointer',
                outline: 'none',
                appearance: 'auto',
                backgroundColor: 'rgba(18, 24, 38, 0.8)',
                paddingRight: '1rem'
              }}
            >
              <option value="status" style={{ background: '#0b0f19', color: '#f8fafc' }}>Status</option>
              <option value="name" style={{ background: '#0b0f19', color: '#f8fafc' }}>Name</option>
              <option value="progress" style={{ background: '#0b0f19', color: '#f8fafc' }}>Progress</option>
              <option value="totalPicked" style={{ background: '#0b0f19', color: '#f8fafc' }}>Total Picked</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="wms-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Role</th>
                <th>Status</th>
                <th>Efficiency</th>
                <th>Picking Wave</th>
                <th style={{ minWidth: '160px' }}>Progress</th>
                <th>Location</th>
                <th>Shift Time</th>
                <th>Total Picked</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading employees...</td>
                </tr>
              ) : sortedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No employees found.</td>
                </tr>
              ) : sortedEmployees.map((emp) => {
                const hasProgress = emp.currentProgress !== null && emp.totalProgress !== null;
                const pct = hasProgress 
                  ? Math.round((emp.currentProgress! / emp.totalProgress!) * 100) 
                  : 0;

                return (
                  <tr key={emp.id}>
                    {/* Employee with Status Dot */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span className={`dot ${emp.dotClass}`} title={emp.status} />
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{emp.name}</span>
                      </div>
                    </td>

                    {/* Role */}
                    <td>
                      <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {emp.role}
                      </span>
                    </td>

                    {/* Status Select */}
                    <td>
                      <select 
                        value={emp.status} 
                        onChange={(e) => handleUpdateWorker(emp.id, { status: e.target.value })}
                        className={`badge ${emp.badgeClass}`}
                        style={{ cursor: 'pointer', outline: 'none', appearance: 'auto', border: 'none', backgroundColor: 'transparent' }}
                      >
                        <option value="IDLE">IDLE</option>
                        <option value="PICKING">PICKING</option>
                        <option value="PUTAWAY">PUTAWAY</option>
                        <option value="SORTING">SORTING</option>
                        <option value="RECEIVING">RECEIVING</option>
                        <option value="DISPATCHING">DISPATCHING</option>
                        <option value="BREAK">BREAK</option>
                        <option value="OFFLINE">OFFLINE</option>
                      </select>
                    </td>

                    {/* Efficiency Input */}
                    <td>
                      <input 
                        type="number"
                        min="0"
                        step="0.1"
                        value={emp.efficiency}
                        onChange={(e) => handleUpdateWorker(emp.id, { efficiency: parseFloat(e.target.value) })}
                        style={{ width: '60px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '2px 4px', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}
                      />
                    </td>

                    {/* Picking Wave */}
                    <td style={{ fontFamily: 'var(--font-mono)', color: emp.wave !== '—' ? 'var(--primary)' : 'var(--text-muted)' }}>
                      {emp.wave}
                    </td>

                    {/* Progress Column */}
                    <td>
                      {hasProgress ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                            <span>{emp.currentProgress}/{emp.totalProgress}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pct}%</span>
                          </div>
                          <div className="progress-bar-bg">
                            <div 
                              className="progress-bar-fill" 
                              style={{ 
                                width: `${pct}%`,
                                backgroundColor: emp.status === 'SORTING' 
                                  ? '#e359ac' 
                                  : pct === 100 
                                    ? '#22c55e' 
                                    : emp.status === 'PUTAWAY' || emp.status === 'DISPATCHING'
                                      ? '#f59e0b'
                                      : '#22c55e'
                              }} 
                            />
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>—</span>
                      )}
                    </td>

                    {/* Location */}
                    <td style={{ fontFamily: 'var(--font-mono)', color: emp.location !== '—' ? 'var(--text-main)' : 'var(--text-muted)' }}>
                      {emp.location}
                    </td>

                    {/* Shift Time */}
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {emp.shiftTime}
                    </td>

                    {/* Total Picked */}
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#e359ac' }}>
                      {emp.totalPicked}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

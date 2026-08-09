import React, { useState, useEffect, useRef } from 'react';
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
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Zap
} from 'lucide-react';
import { WorkerStatus } from '../types';

export interface Employee {
  id: string;
  name: string;
  role: 'PICKER' | 'INBOUND_OPERATOR' | 'PACKER_DISPATCHER';
  status: WorkerStatus;
  dotClass: 'dot-online' | 'dot-busy' | 'dot-offline';
  badgeClass: string;
  wave: string;
  currentProgress: number | null;
  totalProgress: number | null;
  location: string;
  shiftTime: string;
  totalPicked: number;
  efficiency: number;
  currentCartItems: number;
  cartCapacityItems: number;
}

type FilterType = 'All' | 'Active' | 'On Break';
type SortKey = 'status' | 'name' | 'progress' | 'totalPicked';

export default function Employees() {
  const [filter, setFilter] = useState<FilterType>('All');
  const [sortBy, setSortBy] = useState<SortKey>('status');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI States
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [editingEfficiencyId, setEditingEfficiencyId] = useState<string | null>(null);
  const [editingEfficiencyValue, setEditingEfficiencyValue] = useState<string>('');
  const [openStatusDropdownId, setOpenStatusDropdownId] = useState<string | null>(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await userService.getEmployees();
        // Filter out ADMIN_MANAGER since they are not floor workers
        const floorWorkers = data.filter((emp: any) => emp.role !== 'ADMIN_MANAGER');
        
        const mappedData = floorWorkers.map((emp: any) => {
          let dotClass = 'dot-offline';
          let badgeClass = 'badge-muted';
          if (['PICKING', 'RECEIVING'].includes(emp.status)) { dotClass = 'dot-online'; badgeClass = 'badge-success'; }
          else if (['PUTAWAY', 'SORTING', 'DISPATCHING'].includes(emp.status)) { dotClass = 'dot-busy'; badgeClass = 'badge-warning'; }
          
          return {
            ...emp,
            name: emp.fullName,
            dotClass,
            badgeClass,
            wave: emp.currentWaveNumber || '—',
            currentProgress: emp.pickingProgress > 0 ? emp.pickingProgress : null,
            totalProgress: emp.pickingProgress > 0 ? 100 : null,
            location: emp.currentLocation || 'Base',
            efficiency: emp.efficiency || 1.0,
            currentCartItems: emp.current_cart_items || 0,
            cartCapacityItems: emp.cart_capacity_items || 15
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
    const interval = setInterval(fetchEmployees, 3000);
    return () => clearInterval(interval);
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

  const handleEfficiencySubmit = (id: string) => {
    const val = parseFloat(editingEfficiencyValue);
    if (!isNaN(val) && val > 0) {
      handleUpdateWorker(id, { efficiency: val });
    }
    setEditingEfficiencyId(null);
  };

  const handleBulkShift = async (action: 'start' | 'end') => {
    if (selectedEmployeeIds.size === 0) return;
    try {
      const ids = Array.from(selectedEmployeeIds);
      if (action === 'start') {
        await userService.startShift(ids);
      } else {
        await userService.endShift(ids);
      }
      setEmployees(prev => prev.map(e => {
        if (ids.includes(e.id)) {
          const newStatus = action === 'start' ? 'IDLE' : 'OFFLINE';
          return { ...e, status: newStatus as WorkerStatus, dotClass: action === 'start' ? 'dot-offline' : 'dot-offline', badgeClass: 'badge-muted' };
        }
        return e;
      }));
      setSelectedEmployeeIds(new Set());
    } catch (err) {
      console.error('Bulk shift error', err);
    }
  };

  const toggleSelectEmployee = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEmployeeIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedEmployeeIds.size === sortedEmployees.length && sortedEmployees.length > 0) {
      setSelectedEmployeeIds(new Set());
    } else {
      setSelectedEmployeeIds(new Set(sortedEmployees.map(e => e.id)));
    }
  };

  // Close dropdowns when clicking outside (simple hack, real impl would use ref)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.status-dropdown-container')) {
        setOpenStatusDropdownId(null);
      }
      if (!(e.target as Element).closest('.efficiency-editor') && editingEfficiencyId) {
        setEditingEfficiencyId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editingEfficiencyId]);

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
    const statusOrder: Record<string, number> = {
      PICKING: 1, RECEIVING: 2, SORTING: 3, PUTAWAY: 4, DISPATCHING: 5, BREAK: 6, IDLE: 7
    };
    return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
  });

  const statuses: WorkerStatus[] = ['PICKING', 'PUTAWAY', 'SORTING', 'RECEIVING', 'DISPATCHING', 'BREAK', 'IDLE', 'OFFLINE'] as WorkerStatus[];

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

      {/* 2. Stats Row */}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <div className="card stat-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Online</span>
            <Users size={18} style={{ color: '#22c55e' }} />
          </div>
          <div className="stat-value" style={{ color: '#22c55e' }}>
            {isLoading ? '...' : employees.filter(e => e.status !== 'OFFLINE' && e.status !== 'IDLE').length}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span className="dot dot-online" /> Active warehouse staff
          </div>
        </div>

        <div className="card stat-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Active Tasks</span>
            <Activity size={18} style={{ color: '#e359ac' }} />
          </div>
          <div className="stat-value" style={{ color: '#e359ac' }}>
            {isLoading ? '...' : employees.filter(e => ['PICKING', 'PUTAWAY', 'SORTING', 'RECEIVING', 'DISPATCHING'].includes(e.status)).length}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span className="dot dot-busy" /> Picking, putaway, sorting
          </div>
        </div>

        <div className="card stat-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">On Break</span>
            <Coffee size={18} style={{ color: '#f59e0b' }} />
          </div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>
            {isLoading ? '...' : employees.filter(e => e.status === 'BREAK').length}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span className="dot dot-busy" /> Scheduled rest period
          </div>
        </div>

        <div className="card stat-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Offline</span>
            <UserX size={18} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="stat-value" style={{ color: 'var(--text-muted)' }}>
            {isLoading ? '...' : employees.filter(e => e.status === 'OFFLINE' || e.status === 'IDLE').length}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span className="dot dot-offline" /> Off-shift / Idle workers
          </div>
        </div>
      </div>

      {/* 3. Main Data Panel (Cards List) */}
      <div className="data-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Radio size={18} style={{ color: '#e359ac' }} />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              Worker Status Feed
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <ArrowUpDown size={14} /> Sort:
            </span>
            <select
              className="btn-ghost"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              style={{ 
                cursor: 'pointer', outline: 'none', appearance: 'auto',
                backgroundColor: 'rgba(18, 24, 38, 0.8)', paddingRight: '1rem'
              }}
            >
              <option value="status" style={{ background: '#0b0f19' }}>Status</option>
              <option value="name" style={{ background: '#0b0f19' }}>Name</option>
              <option value="progress" style={{ background: '#0b0f19' }}>Progress</option>
              <option value="totalPicked" style={{ background: '#0b0f19' }}>Total Picked</option>
            </select>
          </div>
        </div>

        {/* Header Labels (Optional, purely visual for grid alignment) */}
        <div style={{ display: 'grid', gridTemplateColumns: '40px 2fr 1fr 1.5fr 1fr 1fr 1.5fr', padding: '0 24px 12px 24px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          <div>
            <input 
              type="checkbox" 
              className="wms-checkbox"
              checked={selectedEmployeeIds.size === sortedEmployees.length && sortedEmployees.length > 0}
              onChange={toggleSelectAll}
            />
          </div>
          <div>Employee</div>
          <div>Role</div>
          <div>Status</div>
          <div>Location</div>
          <div>Cart</div>
          <div>Activity</div>
        </div>

        {/* Bulk Action Bar */}
        {selectedEmployeeIds.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px 24px', background: 'rgba(227, 89, 172, 0.05)', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {selectedEmployeeIds.size} selected
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: '0.75rem' }} onClick={() => handleBulkShift('start')}>
                Start Shift
              </button>
              <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: '0.75rem' }} onClick={() => handleBulkShift('end')}>
                End Shift
              </button>
            </div>
          </div>
        )}

        {/* Cards List */}
        <div className="employee-list" style={{ marginTop: '16px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading employees...</div>
          ) : sortedEmployees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No employees found.</div>
          ) : sortedEmployees.map((emp) => {
            const hasProgress = emp.currentProgress !== null && emp.totalProgress !== null;
            const pct = hasProgress ? Math.round((emp.currentProgress! / emp.totalProgress!) * 100) : 0;
            const isExpanded = expandedCardId === emp.id;
            const isDropdownOpen = openStatusDropdownId === emp.id;

            return (
              <div key={emp.id} className="employee-card" style={{ position: 'relative', zIndex: isDropdownOpen ? 50 : 1 }}>
                {/* Main Row */}
                <div 
                  className="employee-card-main" 
                  style={{ gridTemplateColumns: '40px 2fr 1fr 1.5fr 1fr 1fr 1.5fr' }}
                  onClick={() => setExpandedCardId(isExpanded ? null : emp.id)}
                >
                  {/* Checkbox */}
                  <div onClick={(e) => toggleSelectEmployee(emp.id, e)} style={{ display: 'flex', alignItems: 'center' }}>
                    <input 
                      type="checkbox" 
                      className="wms-checkbox"
                      checked={selectedEmployeeIds.has(emp.id)}
                      readOnly
                    />
                  </div>

                  {/* Name & Dot */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className={`dot ${emp.dotClass}`} />
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{emp.name}</span>
                  </div>

                  {/* Role */}
                  <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {emp.role}
                  </div>

                  {/* Status Badges with Custom Dropdown */}
                  <div className="status-dropdown-container" onClick={(e) => e.stopPropagation()}>
                    <div 
                      className={`badge ${emp.badgeClass}`}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => setOpenStatusDropdownId(openStatusDropdownId === emp.id ? null : emp.id)}
                    >
                      {emp.status}
                      <ChevronDown size={12} />
                    </div>
                    {openStatusDropdownId === emp.id && (
                      <div className="status-dropdown-menu">
                        {statuses.map(s => (
                          <button
                            key={s}
                            className="status-dropdown-item"
                            onClick={() => {
                              handleUpdateWorker(emp.id, { status: s });
                              setOpenStatusDropdownId(null);
                            }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Location Inline */}
                  <div style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                    {emp.location}
                  </div>

                  {/* Cart Inline */}
                  <div style={{ fontSize: '0.85rem', color: emp.currentCartItems >= emp.cartCapacityItems ? '#ef4444' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontWeight: 600 }}>{emp.currentCartItems}</span>
                    <span style={{ color: 'var(--text-muted)' }}>/ {emp.cartCapacityItems}</span>
                  </div>

                  {/* Activity/Progress */}
                  <div>
                    {hasProgress ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '90%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{emp.wave}</span>
                          <span style={{ color: 'var(--text-main)' }}>{pct}%</span>
                        </div>
                        <div className="progress-bar">
                          <div 
                            className={`progress-bar-fill ${emp.status !== 'PICKING' ? 'cyan' : ''}`}
                            style={{ width: `${pct}%` }} 
                          />
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>Idle</span>
                    )}
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="employee-card-details">
                    <div className="detail-item">
                      <span className="detail-label">Efficiency</span>
                      <span className="detail-value">
                        {emp.efficiency.toFixed(1)}x
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Shift Time</span>
                      <span className={`detail-value ${emp.shiftTime === '00:00' ? 'empty' : ''}`}>
                        {emp.shiftTime}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Wave Assingment</span>
                      <span className={`detail-value ${emp.wave === '—' ? 'empty' : ''}`}>
                        {emp.wave}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Total Items Picked</span>
                      <span className={`detail-value ${emp.totalPicked === 0 ? 'empty' : ''}`} style={{ color: emp.totalPicked > 0 ? '#e359ac' : undefined }}>
                        {emp.totalPicked}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

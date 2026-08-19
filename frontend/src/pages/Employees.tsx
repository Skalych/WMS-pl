import { useState, useEffect, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { userService } from '../api/services';
import {
  Users,
  Activity,
  Coffee,
  UserX,
  ArrowUpDown,
  Radio,
  ChevronDown,
} from 'lucide-react';
import { WorkerStatus } from '../types';
import EmployeeProfileModal from '../components/EmployeeProfileModal';

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

const mapEmployeeData = (emp: any) => {
  let dotClass = 'dot-offline';
  let badgeClass = 'badge-muted';
  if (['PICKING', 'RECEIVING'].includes(emp.status)) { dotClass = 'dot-online'; badgeClass = 'badge-success'; }
  else if (['PUTAWAY', 'SORTING', 'DISPATCHING'].includes(emp.status)) { dotClass = 'dot-busy'; badgeClass = 'badge-warning'; }
  else if (emp.status === 'BREAK') { dotClass = 'dot-busy'; badgeClass = 'badge-warning'; }
  else if (emp.status === 'IDLE') { dotClass = 'dot-online'; badgeClass = 'badge-active'; }

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
};

export default function Employees() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<FilterType>('All');
  const [sortBy, setSortBy] = useState<SortKey>('status');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [openStatusDropdownId, setOpenStatusDropdownId] = useState<string | null>(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
  const [profileModalEmployee, setProfileModalEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await userService.getEmployees();
        const floorWorkers = data.filter((emp: any) => emp.role !== 'ADMIN_MANAGER');
        const mappedData = floorWorkers.map(mapEmployeeData);
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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.status-dropdown-container')) {
        setOpenStatusDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredEmployees = employees.filter(emp => {
    if (filter === 'Active') {
      return ['PICKING', 'PUTAWAY', 'SORTING', 'RECEIVING', 'DISPATCHING'].includes(emp.status);
    }
    if (filter === 'On Break') {
      return ['BREAK', 'IDLE', 'OFFLINE'].includes(emp.status);
    }
    return true;
  });

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'totalPicked') return b.totalPicked - a.totalPicked;
    if (sortBy === 'progress') {
      const pctA = a.totalProgress ? (a.currentProgress! / a.totalProgress) : 0;
      const pctB = b.totalProgress ? (b.currentProgress! / b.totalProgress) : 0;
      return pctB - pctA;
    }
    const statusOrder: Record<string, number> = {
      PICKING: 1, RECEIVING: 2, SORTING: 3, PUTAWAY: 4, DISPATCHING: 5, BREAK: 6, IDLE: 7
    };
    const diff = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });

  const statuses: WorkerStatus[] = ['PICKING', 'PUTAWAY', 'SORTING', 'RECEIVING', 'DISPATCHING', 'BREAK', 'IDLE', 'OFFLINE'] as WorkerStatus[];

  const onlineCount = employees.filter(e => e.status !== 'OFFLINE' && e.status !== 'IDLE').length;
  const activeCount = employees.filter(e => ['PICKING', 'PUTAWAY', 'SORTING', 'RECEIVING', 'DISPATCHING'].includes(e.status)).length;
  const breakCount = employees.filter(e => e.status === 'BREAK').length;
  const offlineCount = employees.filter(e => e.status === 'OFFLINE' || e.status === 'IDLE').length;

  const toggleSelectEmployee = (id: string, e: MouseEvent) => {
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
          return mapEmployeeData({ ...e, status: newStatus });
        }
        return e;
      }));
      setSelectedEmployeeIds(new Set());
    } catch (err) {
      console.error('Bulk shift error', err);
    }
  };

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">{t('employees.title')}</h1>
          <p className="page-subtitle">{t('employees.subtitle')}</p>
        </div>

        <div className="header-actions">
          <span className="badge badge-live">
            <span className="dot-pulse" />
            LIVE
          </span>

          <div className="filter-group">
            {(['All', 'Active', 'On Break'] as FilterType[]).map((f) => (
              <button
                key={f}
                type="button"
                className={`filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-card-row">
            <span className="stat-label">Online</span>
            <Users size={18} className="text-success" />
          </div>
          <div className="stat-value text-success">{isLoading ? '…' : onlineCount}</div>
          <div className="stat-card-footnote">
            <span className="dot dot-online" /> Active warehouse staff
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-row">
            <span className="stat-label">Active Tasks</span>
            <Activity size={18} className="text-accent" />
          </div>
          <div className="stat-value accent">{isLoading ? '…' : activeCount}</div>
          <div className="stat-card-footnote">
            <span className="dot dot-busy" /> Picking, putaway, sorting
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-row">
            <span className="stat-label">On Break</span>
            <Coffee size={18} className="text-warning" />
          </div>
          <div className="stat-value text-warning">{isLoading ? '…' : breakCount}</div>
          <div className="stat-card-footnote">
            <span className="dot dot-busy" /> Scheduled rest period
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-row">
            <span className="stat-label">Offline</span>
            <UserX size={18} className="text-muted" />
          </div>
          <div className="stat-value text-muted">{isLoading ? '…' : offlineCount}</div>
          <div className="stat-card-footnote">
            <span className="dot dot-offline" /> Off-shift / idle workers
          </div>
        </div>
      </div>

      <div className="data-panel">
        <div className="data-panel-header">
          <h2 className="data-panel-title">
            <Radio size={16} className="text-accent" />
            Worker Status Feed
          </h2>

          <div className="header-actions">
            <span className="panel-sort-label">
              <ArrowUpDown size={14} /> Sort:
            </span>
            <select
              className="select-field"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
            >
              <option value="status">Status</option>
              <option value="name">Name</option>
              <option value="progress">Progress</option>
              <option value="totalPicked">Total Picked</option>
            </select>
          </div>
        </div>

        <div className="employee-list-header">
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

        {selectedEmployeeIds.size > 0 && (
          <div className="bulk-action-bar">
            <span className="bulk-action-label">{selectedEmployeeIds.size} selected</span>
            <div className="header-actions">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => handleBulkShift('start')}>
                Start Shift
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleBulkShift('end')}>
                End Shift
              </button>
            </div>
          </div>
        )}

        <div className="data-panel-body">
          <div className="employee-list">
            {isLoading ? (
              <div className="panel-empty">Loading employees…</div>
            ) : sortedEmployees.length === 0 ? (
              <div className="panel-empty">No employees found.</div>
            ) : sortedEmployees.map((emp) => {
              const hasProgress = emp.currentProgress !== null && emp.totalProgress !== null;
              const pct = hasProgress ? Math.round((emp.currentProgress! / emp.totalProgress!) * 100) : 0;
              const isExpanded = expandedCardId === emp.id;
              const isDropdownOpen = openStatusDropdownId === emp.id;
              const cartFull = emp.currentCartItems >= emp.cartCapacityItems;

              return (
                <div
                  key={emp.id}
                  className={`employee-card${isDropdownOpen ? ' is-dropdown-open' : ''}`}
                >
                  <div
                    className="employee-card-main employee-card-main--full"
                    onClick={() => setExpandedCardId(isExpanded ? null : emp.id)}
                  >
                    <div onClick={(e) => toggleSelectEmployee(emp.id, e)}>
                      <input
                        type="checkbox"
                        className="wms-checkbox"
                        checked={selectedEmployeeIds.has(emp.id)}
                        readOnly
                      />
                    </div>

                    <div className="employee-cell-name">
                      <span className={`dot ${emp.dotClass}`} />
                      <span>{emp.name}</span>
                    </div>

                    <div className="employee-cell-role">{emp.role}</div>

                    <div className="status-dropdown-container" onClick={(e) => e.stopPropagation()}>
                      <div
                        className={`badge ${emp.badgeClass} badge-clickable`}
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
                              type="button"
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

                    <div className="employee-cell-location">{emp.location}</div>

                    <div className={`employee-cell-cart${cartFull ? ' is-full' : ''}`}>
                      <span style={{ fontWeight: 600 }}>{emp.currentCartItems}</span>
                      <span className="text-muted">/ {emp.cartCapacityItems}</span>
                    </div>

                    <div>
                      {hasProgress ? (
                        <div className="employee-progress-wrap">
                          <div className="employee-progress-meta">
                            <span className="text-muted">{emp.wave}</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="progress-bar">
                            <div
                              className={`progress-bar-fill${emp.status !== 'PICKING' ? ' cyan' : ''}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="employee-cell-idle">Idle</span>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="employee-card-details">
                      <div className="detail-item">
                        <span className="detail-label">Efficiency</span>
                        <span className="detail-value">{emp.efficiency.toFixed(1)}x</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Shift Time</span>
                        <span className={`detail-value${emp.shiftTime === '00:00' ? ' empty' : ''}`}>
                          {emp.shiftTime}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Wave Assignment</span>
                        <span className={`detail-value${emp.wave === '—' ? ' empty' : ''}`}>
                          {emp.wave}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Total Items Picked</span>
                        <span className={`detail-value${emp.totalPicked === 0 ? ' empty' : ' detail-value-accent'}`}>
                          {emp.totalPicked}
                        </span>
                      </div>
                      <div className="profile-expand-btn">
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProfileModalEmployee(emp);
                          }}
                        >
                          View full profile
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {profileModalEmployee && (
        <EmployeeProfileModal
          employee={profileModalEmployee}
          onClose={() => {
            setProfileModalEmployee(null);
            const fetchEmployees = async () => {
              try {
                const data = await userService.getEmployees();
                const floorWorkers = data.filter((emp: any) => emp.role !== 'ADMIN_MANAGER');
                setEmployees(floorWorkers.map(mapEmployeeData));
              } catch (err) {
                console.error(err);
              }
            };
            fetchEmployees();
          }}
        />
      )}
    </div>
  );
}

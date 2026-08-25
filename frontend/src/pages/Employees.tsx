import { useState, useEffect, useMemo, type MouseEvent as ReactMouseEvent } from 'react';
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
  LayoutGrid,
  List,
} from 'lucide-react';
import { BreakSummary, UserRole, WorkerStatus } from '../types';
import EmployeeProfileModal from '../components/EmployeeProfileModal';
import WorkerLiveCard from '../components/WorkerLiveCard';
import { rowStaggerStyle } from '../utils/rowStagger';

export interface EmployeeView {
  id: string;
  name: string;
  role: UserRole;
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
  hasActiveShift: boolean;
  breakSummary: BreakSummary | null;
}

type PageTab = 'live' | 'roster';
type StatFilter = 'online' | 'active' | 'break' | 'offline';
type SortKey = 'status' | 'name' | 'progress' | 'totalPicked';

const ACTIVE_STATUSES: WorkerStatus[] = [
  WorkerStatus.PICKING,
  WorkerStatus.PUTAWAY,
  WorkerStatus.SORTING,
  WorkerStatus.RECEIVING,
  WorkerStatus.DISPATCHING,
];

const mapEmployeeData = (emp: {
  id: string;
  fullName: string;
  role: UserRole;
  status: WorkerStatus;
  currentLocation?: string;
  currentWaveNumber?: string | null;
  pickingProgress?: number;
  shiftTime?: string;
  totalPicked?: number;
  efficiency?: number;
  currentCartItems?: number;
  cartCapacityItems?: number;
  hasActiveShift?: boolean;
  breakSummary?: BreakSummary | null;
}): EmployeeView => {
  let dotClass: EmployeeView['dotClass'] = 'dot-offline';
  let badgeClass = 'badge-muted';
  if (['PICKING', 'RECEIVING'].includes(emp.status)) {
    dotClass = 'dot-online';
    badgeClass = 'badge-success';
  } else if (['PUTAWAY', 'SORTING', 'DISPATCHING'].includes(emp.status)) {
    dotClass = 'dot-busy';
    badgeClass = 'badge-warning';
  } else if (emp.status === 'BREAK') {
    dotClass = 'dot-busy';
    badgeClass = 'badge-warning';
  } else if (emp.status === 'IDLE') {
    dotClass = 'dot-online';
    badgeClass = 'badge-active';
  }

  return {
    id: emp.id,
    name: emp.fullName,
    role: emp.role,
    status: emp.status,
    dotClass,
    badgeClass,
    wave: emp.currentWaveNumber || '—',
    currentProgress: (emp.pickingProgress ?? 0) > 0 ? emp.pickingProgress! : null,
    totalProgress: (emp.pickingProgress ?? 0) > 0 ? 100 : null,
    location: emp.currentLocation || 'Base',
    shiftTime: emp.shiftTime || '00:00',
    totalPicked: emp.totalPicked ?? 0,
    efficiency: emp.efficiency ?? 1.0,
    currentCartItems: emp.currentCartItems ?? 0,
    cartCapacityItems: emp.cartCapacityItems ?? 15,
    hasActiveShift: emp.hasActiveShift ?? emp.status !== 'OFFLINE',
    breakSummary: emp.breakSummary ?? null,
  };
};

function matchesStatFilter(emp: EmployeeView, filter: StatFilter | null): boolean {
  if (!filter) return emp.status !== 'OFFLINE';
  if (filter === 'online') return emp.status !== 'OFFLINE' && emp.status !== 'IDLE';
  if (filter === 'active') return ACTIVE_STATUSES.includes(emp.status);
  if (filter === 'break') return emp.status === 'BREAK';
  return emp.status === 'OFFLINE' || emp.status === 'IDLE';
}

export default function Employees() {
  const { t } = useTranslation();
  const [pageTab, setPageTab] = useState<PageTab>('live');
  const [statFilter, setStatFilter] = useState<StatFilter | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('status');
  const [employees, setEmployees] = useState<EmployeeView[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [openStatusDropdownId, setOpenStatusDropdownId] = useState<string | null>(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
  const [profileModalEmployee, setProfileModalEmployee] = useState<EmployeeView | null>(null);

  const fetchEmployees = async () => {
    try {
      const data = await userService.getEmployees();
      const floorWorkers = data.filter((emp) => emp.role !== 'ADMIN_MANAGER');
      setEmployees(floorWorkers.map((emp) => mapEmployeeData({
        ...emp,
        currentLocation: emp.currentLocation,
      })));
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    const interval = setInterval(fetchEmployees, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateWorker = async (id: string, status: WorkerStatus) => {
    try {
      await userService.updateStatus(id, status);
      setEmployees((prev) =>
        prev.map((e) => {
          if (e.id !== id) return e;
          return mapEmployeeData({
            id: e.id,
            fullName: e.name,
            role: e.role,
            status,
            currentLocation: e.location,
            currentWaveNumber: e.wave === '—' ? null : e.wave,
            pickingProgress: e.currentProgress ?? 0,
            shiftTime: e.shiftTime,
            totalPicked: e.totalPicked,
            efficiency: e.efficiency,
            currentCartItems: e.currentCartItems,
            cartCapacityItems: e.cartCapacityItems,
            hasActiveShift: e.hasActiveShift,
            breakSummary: e.breakSummary,
          });
        }),
      );
    } catch (error) {
      console.error('Failed to update employee', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: Event) => {
      if (!(e.target as Element).closest('.status-dropdown-container')) {
        setOpenStatusDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const liveEmployees = useMemo(
    () => employees.filter((emp) => matchesStatFilter(emp, statFilter)),
    [employees, statFilter],
  );

  const sortedLiveEmployees = useMemo(() => {
    return [...liveEmployees].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'totalPicked') return b.totalPicked - a.totalPicked;
      if (sortBy === 'progress') {
        const pctA = a.totalProgress ? (a.currentProgress! / a.totalProgress) : 0;
        const pctB = b.totalProgress ? (b.currentProgress! / b.totalProgress) : 0;
        return pctB - pctA;
      }
      const statusOrder: Record<string, number> = {
        PICKING: 1, RECEIVING: 2, SORTING: 3, PUTAWAY: 4, DISPATCHING: 5, BREAK: 6, IDLE: 7, OFFLINE: 8,
      };
      const diff = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    });
  }, [liveEmployees, sortBy]);

  const sortedRosterEmployees = useMemo(() => {
    return [...employees].sort((a, b) => a.name.localeCompare(b.name));
  }, [employees]);

  const statuses: WorkerStatus[] = [
    WorkerStatus.PICKING,
    WorkerStatus.PUTAWAY,
    WorkerStatus.SORTING,
    WorkerStatus.RECEIVING,
    WorkerStatus.DISPATCHING,
    WorkerStatus.BREAK,
    WorkerStatus.IDLE,
    WorkerStatus.OFFLINE,
  ];

  const onShiftCount = employees.filter((e) => e.status !== 'OFFLINE').length;
  const onlineCount = employees.filter((e) => e.status !== 'OFFLINE' && e.status !== 'IDLE').length;
  const activeCount = employees.filter((e) => ACTIVE_STATUSES.includes(e.status)).length;
  const breakCount = employees.filter((e) => e.status === 'BREAK').length;
  const offlineCount = employees.filter((e) => e.status === 'OFFLINE' || e.status === 'IDLE').length;

  const toggleStatFilter = (filter: StatFilter) => {
    setStatFilter((prev) => (prev === filter ? null : filter));
    setPageTab('live');
  };

  const toggleSelectEmployee = (id: string, e: ReactMouseEvent) => {
    e.stopPropagation();
    setSelectedEmployeeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedEmployeeIds.size === sortedRosterEmployees.length && sortedRosterEmployees.length > 0) {
      setSelectedEmployeeIds(new Set());
    } else {
      setSelectedEmployeeIds(new Set(sortedRosterEmployees.map((e) => e.id)));
    }
  };

  const handleBulkShift = async (action: 'start' | 'end') => {
    if (selectedEmployeeIds.size === 0) return;
    try {
      const ids = Array.from(selectedEmployeeIds);
      if (action === 'start') await userService.startShift(ids);
      else await userService.endShift(ids);
      await fetchEmployees();
      setSelectedEmployeeIds(new Set());
    } catch (err) {
      console.error('Bulk shift error', err);
    }
  };

  const statCardClass = (filter: StatFilter) =>
    `stat-card stat-card--clickable${statFilter === filter && pageTab === 'live' ? ' stat-card--active' : ''}`;

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

          <div className="team-view-tabs">
            <button
              type="button"
              className={`team-view-tab${pageTab === 'live' ? ' active' : ''}`}
              onClick={() => setPageTab('live')}
            >
              <LayoutGrid size={16} />
              {t('employees.tabLive')}
            </button>
            <button
              type="button"
              className={`team-view-tab${pageTab === 'roster' ? ' active' : ''}`}
              onClick={() => setPageTab('roster')}
            >
              <List size={16} />
              {t('employees.tabRoster')}
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-grid">
        <button type="button" className={statCardClass('online')} onClick={() => toggleStatFilter('online')}>
          <div className="stat-card-row">
            <span className="stat-label">{t('employees.statOnline')}</span>
            <Users size={18} className="text-success" />
          </div>
          <div className="stat-value text-success">{isLoading ? '…' : onlineCount}</div>
          <div className="stat-card-footnote">{t('employees.statOnlineHint')}</div>
        </button>

        <button type="button" className={statCardClass('active')} onClick={() => toggleStatFilter('active')}>
          <div className="stat-card-row">
            <span className="stat-label">{t('employees.statActive')}</span>
            <Activity size={18} className="text-accent" />
          </div>
          <div className="stat-value accent">{isLoading ? '…' : activeCount}</div>
          <div className="stat-card-footnote">{t('employees.statActiveHint')}</div>
        </button>

        <button type="button" className={statCardClass('break')} onClick={() => toggleStatFilter('break')}>
          <div className="stat-card-row">
            <span className="stat-label">{t('employees.statBreak')}</span>
            <Coffee size={18} className="text-warning" />
          </div>
          <div className="stat-value text-warning">{isLoading ? '…' : breakCount}</div>
          <div className="stat-card-footnote">{t('employees.statBreakHint')}</div>
        </button>

        <button type="button" className={statCardClass('offline')} onClick={() => toggleStatFilter('offline')}>
          <div className="stat-card-row">
            <span className="stat-label">{t('employees.statOffline')}</span>
            <UserX size={18} className="text-muted" />
          </div>
          <div className="stat-value text-muted">{isLoading ? '…' : offlineCount}</div>
          <div className="stat-card-footnote">{t('employees.statOfflineHint')}</div>
        </button>
      </div>

      {pageTab === 'live' ? (
        <div className="data-panel">
          <div className="data-panel-header">
            <h2 className="data-panel-title">
              <Radio size={16} className="text-accent" />
              {t('employees.liveTitle', { count: onShiftCount })}
            </h2>
            <div className="header-actions">
              <span className="panel-sort-label">
                <ArrowUpDown size={14} /> {t('employees.sort')}:
              </span>
              <select
                className="select-field"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
              >
                <option value="status">{t('employees.sortStatus')}</option>
                <option value="name">{t('employees.sortName')}</option>
                <option value="progress">{t('employees.sortProgress')}</option>
                <option value="totalPicked">{t('employees.sortPicked')}</option>
              </select>
            </div>
          </div>
          <div className="data-panel-body">
            {isLoading ? (
              <div className="panel-empty">{t('common.loading')}</div>
            ) : sortedLiveEmployees.length === 0 ? (
              <div className="panel-empty">{t('employees.liveEmpty')}</div>
            ) : (
              <div className="team-live-grid data-list-wrap is-ready">
                {sortedLiveEmployees.map((emp, rowIndex) => (
                  <WorkerLiveCard
                    key={emp.id}
                    employee={emp}
                    onOpen={setProfileModalEmployee}
                    className="data-list-row"
                    style={rowStaggerStyle(rowIndex)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="data-panel">
          <div className="data-panel-header">
            <h2 className="data-panel-title">
              <List size={16} className="text-accent" />
              {t('employees.rosterTitle')}
            </h2>
          </div>

          <div className="employee-list-header">
            <div>
              <input
                type="checkbox"
                className="wms-checkbox"
                checked={selectedEmployeeIds.size === sortedRosterEmployees.length && sortedRosterEmployees.length > 0}
                onChange={toggleSelectAll}
              />
            </div>
            <div>{t('employees.colEmployee')}</div>
            <div>{t('employees.colRole')}</div>
            <div>{t('employees.colStatus')}</div>
            <div>{t('employees.colLocation')}</div>
            <div>{t('employees.colCart')}</div>
            <div>{t('employees.colActivity')}</div>
          </div>

          {selectedEmployeeIds.size > 0 && (
            <div className="bulk-action-bar">
              <span className="bulk-action-label">{selectedEmployeeIds.size} selected</span>
              <div className="header-actions">
                <button type="button" className="btn btn-primary btn-sm" onClick={() => handleBulkShift('start')}>
                  {t('employees.startShift')}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleBulkShift('end')}>
                  {t('employees.endShift')}
                </button>
              </div>
            </div>
          )}

          <div className="data-panel-body">
            {isLoading ? (
              <div className="panel-empty">{t('common.loading')}</div>
            ) : sortedRosterEmployees.length === 0 ? (
              <div className="panel-empty">{t('employees.rosterEmpty')}</div>
            ) : (
              <div className="employee-list data-list-wrap is-ready">
                {sortedRosterEmployees.map((emp, rowIndex) => {
                  const hasProgress = emp.currentProgress !== null && emp.totalProgress !== null;
                  const pct = hasProgress ? Math.round((emp.currentProgress! / emp.totalProgress!) * 100) : 0;
                  const isExpanded = expandedCardId === emp.id;
                  const isDropdownOpen = openStatusDropdownId === emp.id;
                  const cartFull = emp.currentCartItems >= emp.cartCapacityItems;

                  return (
                    <div
                      key={emp.id}
                      className={`employee-card data-list-row${isDropdownOpen ? ' is-dropdown-open' : ''}`}
                      style={rowStaggerStyle(rowIndex)}
                    >
                      <div
                        className="employee-card-main employee-card-main--full"
                        onClick={() => setExpandedCardId(isExpanded ? null : emp.id)}
                      >
                        <div onClick={(e) => toggleSelectEmployee(emp.id, e)}>
                          <input type="checkbox" className="wms-checkbox" checked={selectedEmployeeIds.has(emp.id)} readOnly />
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
                          {isDropdownOpen && (
                            <div className="status-dropdown-menu">
                              {statuses.map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  className="status-dropdown-item"
                                  onClick={() => {
                                    handleUpdateWorker(emp.id, s);
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
                                <div className={`progress-bar-fill${emp.status !== 'PICKING' ? ' cyan' : ''}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          ) : (
                            <span className="employee-cell-idle">{t('employees.cardIdle')}</span>
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="employee-card-details">
                          {emp.breakSummary && emp.breakSummary.breakCount > 0 && (
                            <div className="detail-item">
                              <span className="detail-label">{t('employees.breaksToday')}</span>
                              <span className={`detail-value${emp.breakSummary.overLimit ? ' text-warning' : ''}`}>
                                {emp.breakSummary.breakCount} · {emp.breakSummary.breakMinutes}m
                              </span>
                            </div>
                          )}
                          <div className="profile-expand-btn">
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setProfileModalEmployee(emp);
                              }}
                            >
                              {t('employees.viewProfile')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {profileModalEmployee && (
        <EmployeeProfileModal
          employee={profileModalEmployee}
          onClose={() => {
            setProfileModalEmployee(null);
            fetchEmployees();
          }}
        />
      )}
    </div>
  );
}

import { AlertTriangle, Coffee } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatTimerSeconds, useLiveSeconds } from '../hooks/useLiveSeconds';
import type { EmployeeView } from '../pages/Employees';

interface Props {
  employee: EmployeeView;
  onOpen: (employee: EmployeeView) => void;
}

export default function WorkerLiveCard({ employee, onOpen }: Props) {
  const { t } = useTranslation();
  const onBreak = employee.status === 'BREAK';
  const breakSeconds = useLiveSeconds(
    employee.breakSummary?.currentBreakStartedAt ?? null,
    onBreak,
  );
  const hasProgress = employee.currentProgress !== null && employee.totalProgress !== null;
  const pct = hasProgress
    ? Math.round((employee.currentProgress! / employee.totalProgress!) * 100)
    : 0;

  return (
    <button
      type="button"
      className={`worker-live-card${onBreak ? ' worker-live-card--break' : ''}${employee.breakSummary?.overLimit ? ' worker-live-card--over-limit' : ''}`}
      onClick={() => onOpen(employee)}
    >
      <div className="worker-live-card-head">
        <span className={`dot ${employee.dotClass}`} />
        <div className="worker-live-card-identity">
          <span className="worker-live-card-name">{employee.name}</span>
          <span className="worker-live-card-role">{employee.role.replace(/_/g, ' ')}</span>
        </div>
        <span className={`badge ${employee.badgeClass}`}>{employee.status}</span>
      </div>

      {onBreak && (
        <div className="worker-live-card-break-timer" aria-live="polite">
          <Coffee size={14} />
          {formatTimerSeconds(breakSeconds)}
        </div>
      )}

      <div className="worker-live-card-meta">
        <span className="worker-live-card-location">{employee.location}</span>
        {employee.breakSummary && employee.breakSummary.breakCount > 0 && (
          <span className={`worker-live-card-breaks${employee.breakSummary.overLimit ? ' is-over-limit' : ''}`}>
            {employee.breakSummary.breakCount} · {employee.breakSummary.breakMinutes}m
            {employee.breakSummary.overLimit && (
              <AlertTriangle size={12} aria-label={t('employees.overBreakLimit')} />
            )}
          </span>
        )}
      </div>

      {hasProgress ? (
        <div className="worker-live-card-progress">
          <div className="employee-progress-meta">
            <span className="text-muted">{employee.wave}</span>
            <span>{pct}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ) : (
        <span className="worker-live-card-idle">{t('employees.cardIdle')}</span>
      )}
    </button>
  );
}

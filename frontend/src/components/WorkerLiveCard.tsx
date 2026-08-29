import { AlertTriangle, Coffee } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CSSProperties } from 'react';
import { formatTimerSeconds, useLiveSeconds } from '../hooks/useLiveSeconds';
import type { EmployeeView } from '../pages/Employees';

interface Props {
  employee: EmployeeView;
  onOpen: (employee: EmployeeView) => void;
  className?: string;
  style?: CSSProperties;
}

export default function WorkerLiveCard({ employee, onOpen, className, style }: Props) {
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
    <tr
      className={`worker-live-row${onBreak ? ' worker-live-row--break' : ''}${employee.breakSummary?.overLimit ? ' worker-live-row--over-limit' : ''}${className ? ` ${className}` : ''}`}
      style={style}
      onClick={() => onOpen(employee)}
    >
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={`dot ${employee.dotClass}`} />
          <div>
            <span className="worker-live-name">{employee.name}</span>
            <span className="worker-live-role">{employee.role.replace(/_/g, ' ')}</span>
          </div>
        </div>
      </td>
      <td>
        <span className={`badge ${employee.badgeClass}`}>{employee.status}</span>
      </td>
      <td className="text-mono" style={{ fontSize: '0.82rem' }}>
        {employee.location}
      </td>
      <td>
        {onBreak ? (
          <span className="worker-live-card-break-timer" aria-live="polite">
            <Coffee size={14} />
            {formatTimerSeconds(breakSeconds)}
          </span>
        ) : employee.breakSummary && employee.breakSummary.breakCount > 0 ? (
          <span className={`worker-live-card-breaks${employee.breakSummary.overLimit ? ' is-over-limit' : ''}`}>
            {employee.breakSummary.breakCount} · {employee.breakSummary.breakMinutes}m
            {employee.breakSummary.overLimit && (
              <AlertTriangle size={12} aria-label={t('employees.overBreakLimit')} />
            )}
          </span>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      <td className="worker-live-progress-cell">
        {hasProgress ? (
          <div>
            <div className="employee-progress-meta">
              <span className="text-muted">{employee.wave}</span>
              <span>{pct}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        ) : (
          <span className="text-muted">{t('employees.cardIdle')}</span>
        )}
      </td>
    </tr>
  );
}

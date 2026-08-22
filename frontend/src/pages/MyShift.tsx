import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Coffee, Play, Smartphone } from 'lucide-react';
import { myShiftService } from '../api/services';
import { MyShiftSnapshot, UserRole, WorkerStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatTimerSeconds, useLiveSeconds } from '../hooks/useLiveSeconds';

function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}` : `${m} min`;
}

export default function MyShift() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [data, setData] = useState<MyShiftSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError('');
      const snapshot = await myShiftService.getMyShift();
      setData(snapshot);
    } catch {
      setError(t('myShift.loadError'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    refresh();
    const id = setInterval(() => refresh(true), 5000);
    return () => clearInterval(id);
  }, [refresh]);

  const handleBreak = async () => {
    if (!data || busy) return;
    setBusy(true);
    try {
      const next = data.onBreak
        ? await myShiftService.endBreak()
        : await myShiftService.startBreak();
      setData(next);
    } catch {
      setError(t('myShift.breakError'));
    } finally {
      setBusy(false);
    }
  };

  const isInbound = user?.role === UserRole.INBOUND_OPERATOR;
  const isPacker = user?.role === UserRole.PACKER_DISPATCHER;
  const breakSeconds = useLiveSeconds(data?.currentBreakStartedAt ?? null, Boolean(data?.onBreak));
  const statusLabel = data
    ? t(`myShift.status.${data.status}`, { defaultValue: data.status })
    : '';

  return (
    <div className="page-stack my-shift-page">
      <header className="page-header my-shift-header">
        <div>
          <h1 className="page-title">{t('myShift.title')}</h1>
          <p className="page-subtitle">
            {user?.fullName}
            {data?.hasActiveShift ? ` · ${statusLabel}` : ''}
          </p>
        </div>
      </header>

      {loading && !data ? (
        <div className="panel-empty">{t('common.loading')}</div>
      ) : error && !data ? (
        <div className="panel-empty">{error}</div>
      ) : !data?.hasActiveShift ? (
        <div className="my-shift-empty data-panel">
          <h2>{t('myShift.noShiftTitle')}</h2>
          <p>{t('myShift.noShiftHint')}</p>
        </div>
      ) : (
        <>
          {error && <p className="my-shift-error">{error}</p>}

          <div
            className={`my-shift-hero data-panel${data.onBreak ? ' my-shift-hero--break' : ' my-shift-hero--work'}`}
          >
            {data.onBreak ? (
              <>
                <span className="my-shift-mode-label">{t('myShift.onBreakMode')}</span>
                <div className="my-shift-break-timer" aria-live="polite">
                  {formatTimerSeconds(breakSeconds)}
                </div>
                <p className="my-shift-break-total">
                  {t('myShift.breaksTotal', {
                    count: data.breakCount,
                    minutes: data.breakMinutes,
                  })}
                </p>
              </>
            ) : (
              <>
                <span className="my-shift-mode-label">{t('myShift.workMode')}</span>
                {data.currentTask ? (
                  <div className="my-shift-task-progress">
                    <span className="my-shift-label">{t('myShift.currentTask')}</span>
                    <span className="my-shift-big">
                      {data.currentTask.quantityDone}
                      <span className="my-shift-big-sep">/</span>
                      {data.currentTask.quantityTotal}
                    </span>
                    <span className="my-shift-task-type">
                      {data.currentTask.taskType.replace(/_/g, ' ')}
                    </span>
                  </div>
                ) : (
                  <>
                    <span className="my-shift-label">{t('myShift.currentTask')}</span>
                    <p className="my-shift-no-task">{t('myShift.noTask')}</p>
                  </>
                )}
              </>
            )}
          </div>

          {!data.onBreak && (
            <div className="my-shift-metrics-row">
              {!isInbound && !isPacker && (
                <div className="my-shift-metric">
                  <span className="my-shift-metric-label">{t('myShift.itemsPicked')}</span>
                  <span className="my-shift-metric-value accent">{data.totalItemsPicked}</span>
                </div>
              )}
              {isInbound && (
                <div className="my-shift-metric">
                  <span className="my-shift-metric-label">{t('myShift.unitsReceived')}</span>
                  <span className="my-shift-metric-value accent">{data.totalUnitsReceived}</span>
                </div>
              )}
              {!isInbound && (
                <div className="my-shift-metric">
                  <span className="my-shift-metric-label">{t('myShift.pace')}</span>
                  <span className="my-shift-metric-value">
                    {isPacker ? '—' : data.pickRatePerHour}
                    {!isPacker && <span className="my-shift-unit">{t('myShift.perHour')}</span>}
                  </span>
                </div>
              )}
              <div className="my-shift-metric">
                <span className="my-shift-metric-label">{t('myShift.shiftTime')}</span>
                <span className="my-shift-metric-value">{formatMinutes(data.elapsedMinutes)}</span>
              </div>
              <div className="my-shift-metric">
                <span className="my-shift-metric-label">{t('myShift.breakTime')}</span>
                <span className="my-shift-metric-value">{formatMinutes(data.breakMinutes)}</span>
              </div>
            </div>
          )}

          <div className="my-shift-actions">
            <button
              type="button"
              className={`btn ${data.onBreak ? 'btn-primary' : 'btn-secondary'} my-shift-break-btn`}
              onClick={handleBreak}
              disabled={busy || data.status === WorkerStatus.OFFLINE}
            >
              {data.onBreak ? <Play size={18} /> : <Coffee size={18} />}
              {data.onBreak ? t('myShift.endBreak') : t('myShift.startBreak')}
            </button>

            {!data.onBreak && (
              <button type="button" className="btn btn-secondary my-shift-cta" disabled>
                <Smartphone size={18} />
                {t('myShift.terminalComingSoon')}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

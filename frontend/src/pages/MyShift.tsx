import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Coffee, Play, Smartphone } from 'lucide-react';
import { myShiftService } from '../api/services';
import { MyShiftSnapshot, UserRole, WorkerStatus } from '../types';
import { useAuth } from '../context/AuthContext';

function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
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
  const statusLabel = data
    ? t(`myShift.status.${data.status}`, { defaultValue: data.status })
    : '';

  return (
    <div className="page-stack my-shift-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">{t('myShift.title')}</h1>
          <p className="page-subtitle">
            {user?.fullName}
            {data ? ` · ${statusLabel}` : ''}
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

          <div className="my-shift-hero data-panel">
            {data.currentTask ? (
              <>
                <span className="my-shift-label">{t('myShift.currentTask')}</span>
                <div className="my-shift-task-progress">
                  <span className="my-shift-big">
                    {data.currentTask.quantityDone}
                    <span className="my-shift-big-sep">/</span>
                    {data.currentTask.quantityTotal}
                  </span>
                  <span className="my-shift-task-type">
                    {data.currentTask.taskType.replace(/_/g, ' ')}
                  </span>
                </div>
              </>
            ) : (
              <>
                <span className="my-shift-label">{t('myShift.currentTask')}</span>
                <p className="my-shift-no-task">{t('myShift.noTask')}</p>
              </>
            )}
          </div>

          <div className="stats-grid my-shift-stats">
            <div className="stat-card">
              <span className="stat-label">
                {isInbound ? t('myShift.unitsReceived') : t('myShift.itemsPicked')}
              </span>
              <span className="stat-value accent">
                {isInbound ? data.totalUnitsReceived : data.totalItemsPicked}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">{t('myShift.pace')}</span>
              <span className="stat-value">
                {isInbound ? '—' : data.pickRatePerHour}
                {!isInbound && <span className="my-shift-unit">{t('myShift.perHour')}</span>}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">{t('myShift.shiftTime')}</span>
              <span className="stat-value">{formatMinutes(data.elapsedMinutes)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">{t('myShift.breakTime')}</span>
              <span className="stat-value">{formatMinutes(data.breakMinutes)}</span>
            </div>
          </div>

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

            <button type="button" className="btn btn-secondary my-shift-cta" disabled>
              <Smartphone size={18} />
              {t('myShift.terminalComingSoon')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

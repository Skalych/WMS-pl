import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Activity, Maximize2, Radio, Package, Layers, Truck, Users, TrendingUp } from 'lucide-react';
import { ShiftLiveSnapshot } from '../types';

interface ShiftPulseBoardProps {
  data: ShiftLiveSnapshot | null;
  connected: boolean;
  fullscreen?: boolean;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatBucketLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function ShiftPulseBoard({ data, connected, fullscreen = false }: ShiftPulseBoardProps) {
  const { t } = useTranslation();

  const maxBucket = useMemo(() => {
    if (!data?.hourly_buckets?.length) return 1;
    return Math.max(...data.hourly_buckets.map((b) => Math.max(b.picked, b.inbound)), 1);
  }, [data]);

  const labelEvery = useMemo(() => {
    const minutes = data?.bucket_minutes ?? 15;
    return Math.max(1, Math.round(60 / minutes));
  }, [data?.bucket_minutes]);

  const bucketLabel = data?.bucket_minutes ?? 15;
  const chartRange = data?.chart_window_start && data?.chart_window_end
    ? `${formatBucketLabel(data.chart_window_start)} – ${formatBucketLabel(data.chart_window_end)}`
    : null;

  if (!data) {
    return (
      <div className={`shift-pulse ${fullscreen ? 'shift-pulse--fullscreen' : ''}`}>
        <div className="shift-pulse-loading">{t('shiftPulse.loading')}</div>
      </div>
    );
  }

  const kpis = [
    { label: t('shiftPulse.kpiItemsPicked'), value: data.items_picked, delta: data.items_picked_delta_5m, icon: Package, accent: 'blue' },
    { label: t('shiftPulse.kpiWaves'), value: `${data.waves_completed} / ${data.waves_active}`, icon: Layers, accent: 'pink' },
    { label: t('shiftPulse.kpiShipped'), value: data.orders_shipped, icon: Truck, accent: 'green' },
    { label: t('shiftPulse.kpiInbound'), value: data.inbound_received_units, icon: Package, accent: 'amber' },
    { label: t('shiftPulse.kpiPickers'), value: data.pickers_online, icon: Users, accent: 'cyan' },
    { label: t('shiftPulse.kpiPickRate'), value: data.pick_rate_per_hour, icon: TrendingUp, accent: 'blue' },
  ];

  return (
    <section className={`shift-pulse ${fullscreen ? 'shift-pulse--fullscreen' : ''}`}>
      <header className="shift-pulse-header">
        <div className="shift-pulse-title">
          <Activity size={fullscreen ? 28 : 20} />
          <div>
            <h2>{t('shiftPulse.title')}</h2>
            <p>
              {data.shift_active && data.shift_started_at ? (
                <>
                  {t('shiftPulse.started')} {formatTime(data.shift_started_at)} · {formatElapsed(data.elapsed_seconds)}{' '}
                  {t('shiftPulse.elapsed')}
                </>
              ) : (
                <>{t('shiftPulse.noShift')}</>
              )}
            </p>
          </div>
        </div>
        <div className="shift-pulse-meta">
          <span className={`shift-live-badge ${connected ? 'live' : 'polling'}`}>
            <Radio size={14} />
            {connected ? t('shiftPulse.live') : t('shiftPulse.polling')}
          </span>
          {!fullscreen && (
            <Link to="/shift/board" className="shift-board-link" title={t('shiftPulse.fullscreen')}>
              <Maximize2 size={16} />
              {t('shiftPulse.fullscreen')}
            </Link>
          )}
        </div>
      </header>

      <div className="shift-kpi-grid">
        {kpis.map((kpi) => (
          <div key={kpi.label} className={`shift-kpi shift-kpi--${kpi.accent}`}>
            <div className="shift-kpi-top">
              <span>{kpi.label}</span>
              <kpi.icon size={16} />
            </div>
            <div className="shift-kpi-value">{kpi.value}</div>
            {kpi.delta !== undefined && kpi.delta > 0 && (
              <div className="shift-kpi-delta">{t('shiftPulse.deltaLast5Min', { count: kpi.delta })}</div>
            )}
          </div>
        ))}
      </div>

      <div className="shift-pulse-body">
        <div className="shift-chart-panel">
          <h3>
            {t('shiftPulse.throughput', { minutes: bucketLabel })}
            {chartRange && <span className="shift-chart-range"> · {chartRange}</span>}
          </h3>
          <div className="shift-chart">
            {data.hourly_buckets.map((bucket, index) => (
              <div key={bucket.time} className="shift-chart-col" title={`${formatBucketLabel(bucket.time)}: ${bucket.picked} picked, ${bucket.inbound} inbound`}>
                <div className="shift-chart-bars">
                  <div
                    className="shift-chart-bar shift-chart-bar--picked"
                    style={{ height: `${(bucket.picked / maxBucket) * 100}%` }}
                  />
                  <div
                    className="shift-chart-bar shift-chart-bar--inbound"
                    style={{ height: `${(bucket.inbound / maxBucket) * 100}%` }}
                  />
                </div>
                <span className={`shift-chart-label ${index % labelEvery !== 0 ? 'shift-chart-label--hidden' : ''}`}>
                  {formatBucketLabel(bucket.time)}
                </span>
              </div>
            ))}
          </div>
          <div className="shift-chart-legend">
            <span><i className="dot dot-picked" /> {t('shiftPulse.picked')}</span>
            <span><i className="dot dot-inbound" /> {t('shiftPulse.inbound')}</span>
          </div>
        </div>

        <div className="shift-feed-panel">
          <h3>{t('shiftPulse.liveActivity')}</h3>
          <ul className="shift-feed">
            {data.recent_events.length === 0 ? (
              <li className="shift-feed-empty">{t('shiftPulse.noActivity')}</li>
            ) : (
              data.recent_events
                .slice()
                .reverse()
                .map((event) => (
                  <li key={event.id} className={`shift-feed-item shift-feed-item--${event.type.toLowerCase()}`}>
                    <span className="shift-feed-time">{formatTime(event.at)}</span>
                    <span className="shift-feed-actor">{event.actor}</span>
                    <span className="shift-feed-detail">{event.detail}</span>
                  </li>
                ))
            )}
          </ul>
        </div>
      </div>

      {data.top_pickers.length > 0 && (
        <div className="shift-leaderboard">
          <h3>{t('shiftPulse.topPickers')}</h3>
          <div className="shift-leaderboard-list">
            {data.top_pickers.map((picker, index) => (
              <div key={picker.user_id} className="shift-leader-row">
                <span className="shift-leader-rank">#{index + 1}</span>
                <span className="shift-leader-name">{picker.name}</span>
                <div className="shift-leader-bar-wrap">
                  <div className="shift-leader-bar" style={{ width: `${picker.pct_of_leader}%` }} />
                </div>
                <span className="shift-leader-count">{picker.items}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

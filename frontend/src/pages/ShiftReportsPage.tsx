import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';
import { warehouseShiftService, type WarehouseShiftSummary } from '../api/services';
import { rowStaggerStyle } from '../utils/rowStagger';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function formatStart(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleString(locale === 'uk' ? 'uk-UA' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ShiftReportsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [items, setItems] = useState<WarehouseShiftSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await warehouseShiftService.list({
        from: from || undefined,
        to: to || undefined,
      });
      // #region agent log
      fetch('http://127.0.0.1:7561/ingest/68e178b3-64a6-4d12-b3fd-4d1696e0235a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b88893'},body:JSON.stringify({sessionId:'b88893',hypothesisId:'A',location:'ShiftReportsPage.tsx:load',message:'loaded shifts',data:{count:data.length,rows:data.map(s=>({id:s.id,isActive:s.isActive,items:s.itemsPicked,started:s.startedAt}))},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      setItems(data);
      setSelectedId((prev) => {
        if (prev && data.some((s) => s.id === prev)) return prev;
        return data[0]?.id ?? null;
      });
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((s) => formatStart(s.startedAt, i18n.language).toLowerCase().includes(q));
  }, [items, search, i18n.language]);

  const selected = filtered.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="shift-reports-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">{t('shiftReports.title')}</h1>
          <p className="page-subtitle">{t('shiftReports.subtitle')}</p>
        </div>
      </header>

      <div className="shift-reports-filters">
        <label>
          <span>{t('shiftReports.filterFrom')}</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          <span>{t('shiftReports.filterTo')}</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label className="shift-reports-search">
          <span className="sr-only">{t('shiftReports.searchDate')}</span>
          <input
            type="search"
            placeholder={t('shiftReports.searchDate')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      <div className={`shift-reports-layout${selected ? ' is-inspector-open' : ''}`}>
        <div
          className={`shift-reports-table-wrap${!loading && filtered.length > 0 ? ' is-ready' : ''}`}
        >
          {loading ? (
            <p className="muted shift-reports-placeholder">{t('common.loading')}</p>
          ) : filtered.length === 0 ? (
            <p className="muted shift-reports-placeholder">{t('shiftReports.emptyList')}</p>
          ) : (
            <table className="shift-reports-table">
              <thead>
                <tr>
                  <th>{t('shiftReports.colStart')}</th>
                  <th>{t('shiftReports.colDuration')}</th>
                  <th>{t('shiftReports.colWaves')}</th>
                  <th>{t('shiftReports.colPicked')}</th>
                  <th>{t('shiftReports.colRate')}</th>
                  <th>{t('shiftReports.colStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, rowIndex) => {
                  const active = row.id === selectedId;
                  return (
                    <tr
                      key={row.id}
                      className={active ? 'is-selected' : undefined}
                      style={rowStaggerStyle(rowIndex)}
                      onClick={() => setSelectedId(row.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedId(row.id);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-selected={active}
                    >
                      <td>{formatStart(row.startedAt, i18n.language)}</td>
                      <td>{formatDuration(row.elapsedSeconds)}</td>
                      <td>{row.wavesCompleted}</td>
                      <td>{row.itemsPicked}</td>
                      <td>{row.pickRatePerHour}</td>
                      <td>
                        <span className={`shift-status-pill ${row.isActive ? 'is-active' : 'is-closed'}`}>
                          {row.isActive ? t('shiftReports.statusActive') : t('shiftReports.statusClosed')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <aside
          className={`shift-reports-inspector${selected ? ' is-open' : ''}`}
          aria-live="polite"
          aria-hidden={!selected}
        >
          <div className="shift-reports-inspector-inner">
            {!selected ? (
              <p className="muted inspector-idle-hint">{t('shiftReports.pickHint')}</p>
            ) : (
              <div key={selected.id} className="inspector-content">
                <div className="inspector-heading">
                  <FileText size={20} aria-hidden />
                  <div>
                    <h2>{formatStart(selected.startedAt, i18n.language)}</h2>
                    <p>
                      {formatDuration(selected.elapsedSeconds)} ·{' '}
                      {selected.isActive ? t('shiftReports.statusActive') : t('shiftReports.statusClosed')}
                    </p>
                  </div>
                </div>

                <div className="inspector-kpi-strip">
                  <div>
                    <span className="kpi-label">{t('shiftReports.inspectorWaves')}</span>
                    <strong>{selected.wavesCompleted}</strong>
                  </div>
                  <div>
                    <span className="kpi-label">{t('shiftReports.inspectorPicked')}</span>
                    <strong>{selected.itemsPicked}</strong>
                  </div>
                  <div>
                    <span className="kpi-label">{t('shiftReports.inspectorInbound')}</span>
                    <strong>{selected.inboundReceivedUnits}</strong>
                  </div>
                  <div>
                    <span className="kpi-label">{t('shiftReports.inspectorRate')}</span>
                    <strong>{selected.pickRatePerHour}</strong>
                  </div>
                </div>

                {selected.topPickers.length > 0 && (
                  <div className="inspector-top">
                    <h3>{t('shiftReports.inspectorTop')}</h3>
                    <ul>
                      {selected.topPickers.map((p) => (
                        <li key={p.userId}>
                          <span>{p.name}</span>
                          <span>
                            {p.items} · {p.pctOfLeader}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selected.hourlyBuckets.length > 0 && (
                  <div className="inspector-mini-chart" aria-hidden>
                    {selected.hourlyBuckets.map((b, i) => {
                      const max = Math.max(1, ...selected.hourlyBuckets.map((x) => x.picked + x.inbound));
                      const h = Math.round(((b.picked + b.inbound) / max) * 100);
                      return <span key={`${b.time}-${i}`} style={{ height: `${Math.max(h, 4)}%` }} />;
                    })}
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => navigate(`/reports/${selected.id}`)}
                >
                  {t('shiftReports.openReport')}
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

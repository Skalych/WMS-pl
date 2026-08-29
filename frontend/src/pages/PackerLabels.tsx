import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, Printer, RefreshCw, Tag } from 'lucide-react';
import { packerService } from '../api/services';
import { BufferEntry, ContainerLabelBatch } from '../types';
import { printContainerLabels } from '../utils/printContainerLabels';

const PRESETS = [25, 50, 100] as const;
const DEFAULT_COUNT = 100;

export default function PackerLabels() {
  const { t } = useTranslation();
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [batch, setBatch] = useState<ContainerLabelBatch | null>(null);
  const [buffers, setBuffers] = useState<BufferEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refreshBuffers = useCallback(async () => {
    try {
      setError('');
      const rows = await packerService.listBuffers();
      setBuffers(rows);
    } catch {
      setError(t('packerLabels.loadError'));
    }
  }, [t]);

  useEffect(() => {
    refreshBuffers();
    const id = setInterval(refreshBuffers, 10000);
    return () => clearInterval(id);
  }, [refreshBuffers]);

  const runPrint = (result: ContainerLabelBatch) => {
    printContainerLabels(
      result.labels.map((l) => l.barcode),
      t('packerLabels.printTitle', { count: result.count }),
    );
  };

  const handleGenerateAndPrint = async () => {
    const safeCount = Math.min(100, Math.max(1, count));
    setLoading(true);
    setError('');
    try {
      const generated = await packerService.generateContainers(safeCount);
      setBatch(generated);
      runPrint(generated);
    } catch {
      setError(t('packerLabels.generateError'));
    } finally {
      setLoading(false);
    }
  };

  const handleReprint = () => {
    if (batch) runPrint(batch);
  };

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">{t('packerLabels.title')}</h1>
          <p className="page-subtitle">{t('packerLabels.subtitle')}</p>
        </div>
      </header>

      {error && <div className="panel-empty">{error}</div>}

      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">
            <Tag size={18} />
            {t('packerLabels.generateTitle')}
          </h2>
        </div>
        <div className="panel-body packer-labels-actions">
          <label className="form-field packer-labels-count">
            <span className="form-label">{t('packerLabels.count')}</span>
            <input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="form-input"
            />
          </label>

          <div className="packer-labels-presets" role="group" aria-label={t('packerLabels.presets')}>
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`btn btn-ghost btn-sm${count === preset ? ' is-active' : ''}`}
                onClick={() => setCount(preset)}
              >
                {preset}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-primary packer-labels-print-btn"
            onClick={handleGenerateAndPrint}
            disabled={loading}
          >
            <Printer size={16} />
            {loading ? t('common.loading') : t('packerLabels.generateAndPrint')}
          </button>
        </div>

        {batch && (
          <div className="panel-body packer-labels-result">
            <p className="packer-labels-summary">
              {t('packerLabels.batchSummary', {
                count: batch.count,
                from: batch.fromBarcode,
                to: batch.toBarcode,
              })}
            </p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleReprint}>
              <Printer size={14} />
              {t('packerLabels.reprint')}
            </button>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">
            <Package size={18} />
            {t('packerLabels.buffersTitle')}
          </h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={refreshBuffers}>
            <RefreshCw size={14} />
            {t('common.refresh')}
          </button>
        </div>
        <div className="panel-body">
          {buffers.length === 0 ? (
            <div className="panel-empty">{t('packerLabels.noBuffers')}</div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('packerLabels.colBuffer')}</th>
                    <th>{t('packerLabels.colContainer')}</th>
                    <th>{t('packerLabels.colPicker')}</th>
                    <th>{t('packerLabels.colTask')}</th>
                  </tr>
                </thead>
                <tbody>
                  {buffers.map((row) => (
                    <tr key={`${row.buffer}-${row.containerBarcode}`}>
                      <td className="text-mono">{row.buffer ?? '—'}</td>
                      <td className="text-mono">{row.containerBarcode}</td>
                      <td>{row.pickerName ?? '—'}</td>
                      <td className="text-mono">{row.taskNumber ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

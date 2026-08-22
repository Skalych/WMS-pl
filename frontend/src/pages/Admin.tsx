import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dashboardService, orderService } from '../api/services';

export default function Admin() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSimulationActive, setIsSimulationActive] = useState<boolean | null>(null);
  const [simulationLoading, setSimulationLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadSimulationStatus = async () => {
      try {
        const status = await dashboardService.getSimulationStatus();
        if (!cancelled) {
          setIsSimulationActive(status.simulation_active);
        }
      } catch (err) {
        console.error('Failed to load simulation status', err);
        if (!cancelled) {
          setIsSimulationActive(true);
        }
      }
    };

    void loadSimulationStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggleSimulation = async () => {
    if (isSimulationActive === null) return;

    const newState = !isSimulationActive;
    setIsSimulationActive(newState);
    setSimulationLoading(true);

    try {
      await dashboardService.toggleSimulation(newState);
    } catch (err) {
      console.error('Failed to toggle simulation', err);
      setIsSimulationActive(!newState);
    } finally {
      setSimulationLoading(false);
    }
  };

  const handleGenerate = async (size: 'small' | 'medium' | 'large') => {
    setLoading(true);
    setMessage('');
    try {
      await orderService.createMacroOrder(size);
      setMessage(t('admin.generateSuccess', { size }));
    } catch (err) {
      console.error(err);
      setMessage(t('admin.generateError', { size }));
    } finally {
      setLoading(false);
    }
  };

  const isSuccess = message.includes('Success') || message.includes('Успішно');

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">{t('admin.title')}</h1>
          <p className="page-subtitle">{t('admin.subtitle')}</p>
        </div>
      </header>

      {message && (
        <div className={`alert ${isSuccess ? 'alert-success' : 'alert-error'}`}>
          {message}
        </div>
      )}

      <div className="stat-card sim-card sim-card--info">
        <div>
          <h3 className="sim-card-title">{t('admin.simulationToggleTitle')}</h3>
          <p className="sim-card-desc">{t('admin.simulationToggleDesc')}</p>
        </div>
        <button
          type="button"
          className={`sidebar-autopilot-btn ${isSimulationActive ? 'on' : ''}`}
          onClick={handleToggleSimulation}
          disabled={isSimulationActive === null || simulationLoading}
          aria-pressed={isSimulationActive ?? false}
        >
          {isSimulationActive === null
            ? t('common.loading')
            : isSimulationActive
              ? t('common.on')
              : t('common.off')}
        </button>
      </div>

      <div className="sim-grid">
        <div className="stat-card sim-card sim-card--info">
          <div>
            <h3 className="sim-card-title">{t('admin.smallBatchTitle')}</h3>
            <p className="sim-card-desc">{t('admin.smallBatchDesc')}</p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleGenerate('small')}
            disabled={loading}
          >
            {loading ? t('admin.generating') : t('admin.generateSmall')}
          </button>
        </div>

        <div className="stat-card sim-card sim-card--accent">
          <div>
            <h3 className="sim-card-title">{t('admin.mediumBatchTitle')}</h3>
            <p className="sim-card-desc">{t('admin.mediumBatchDesc')}</p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleGenerate('medium')}
            disabled={loading}
          >
            {loading ? t('admin.generating') : t('admin.generateMedium')}
          </button>
        </div>

        <div className="stat-card sim-card sim-card--warning">
          <div>
            <h3 className="sim-card-title">{t('admin.largeBatchTitle')}</h3>
            <p className="sim-card-desc">{t('admin.largeBatchDesc')}</p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleGenerate('large')}
            disabled={loading}
          >
            {loading ? t('admin.generating') : t('admin.generateLarge')}
          </button>
        </div>
      </div>
    </div>
  );
}

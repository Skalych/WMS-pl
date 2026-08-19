import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { orderService } from '../api/services';

export default function Admin() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleGenerate = async (size: 'small' | 'medium' | 'large') => {
    setLoading(true);
    setMessage('');
    try {
      await orderService.createMacroOrder(size);
      setMessage(`Successfully generated ${size} macro-order!`);
    } catch (err) {
      console.error(err);
      setMessage(`Failed to generate ${size} macro-order.`);
    } finally {
      setLoading(false);
    }
  };

  const isSuccess = message.includes('Success');

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

      <div className="sim-grid">
        <div className="stat-card sim-card sim-card--info">
          <div>
            <h3 className="sim-card-title">Small Batch</h3>
            <p className="sim-card-desc">5 orders, 1–3 items each</p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleGenerate('small')}
            disabled={loading}
          >
            {loading ? 'Generating…' : 'Generate Small'}
          </button>
        </div>

        <div className="stat-card sim-card sim-card--accent">
          <div>
            <h3 className="sim-card-title">Medium Batch</h3>
            <p className="sim-card-desc">20 orders, 2–5 items each</p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleGenerate('medium')}
            disabled={loading}
          >
            {loading ? 'Generating…' : 'Generate Medium'}
          </button>
        </div>

        <div className="stat-card sim-card sim-card--warning">
          <div>
            <h3 className="sim-card-title">Large Batch</h3>
            <p className="sim-card-desc">50 orders, 5–10 items each</p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleGenerate('large')}
            disabled={loading}
          >
            {loading ? 'Generating…' : 'Generate Large'}
          </button>
        </div>
      </div>
    </div>
  );
}

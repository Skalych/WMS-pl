import React, { useState } from 'react';
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

  return (
    <div className="admin-page" style={{ padding: '2rem' }}>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.8rem', fontWeight: 800 }}>Sim Tools</h1>
          <div className="page-subtitle" style={{ color: 'var(--text-muted)' }}>Generate macro-orders for simulation</div>
        </div>
      </div>

      {message && (
        <div style={{ padding: '1rem', marginBottom: '2rem', borderRadius: '8px', backgroundColor: message.includes('Success') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: message.includes('Success') ? '#22c55e' : '#ef4444', border: `1px solid ${message.includes('Success') ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
          {message}
        </div>
      )}

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        {/* SMALL */}
        <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '4px solid #38bdf8' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Small Batch</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>5 orders, 1-3 items each</p>
          </div>
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '0.75rem', backgroundColor: '#38bdf8' }}
            onClick={() => handleGenerate('small')}
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate Small'}
          </button>
        </div>

        {/* MEDIUM */}
        <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '4px solid #e359ac' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Medium Batch</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>20 orders, 2-5 items each</p>
          </div>
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '0.75rem' }}
            onClick={() => handleGenerate('medium')}
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate Medium'}
          </button>
        </div>

        {/* LARGE */}
        <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '4px solid #f59e0b' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Large Batch</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>50 orders, 5-10 items each</p>
          </div>
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '0.75rem', backgroundColor: '#f59e0b' }}
            onClick={() => handleGenerate('large')}
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate Large'}
          </button>
        </div>
      </div>
    </div>
  );
}

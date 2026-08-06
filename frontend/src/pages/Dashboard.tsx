import React from 'react';

export default function Dashboard() {
  const chartData = [
    { time: '14:00', height: '45%' },
    { time: '15:00', height: '62%' },
    { time: '16:00', height: '78%' },
    { time: '17:00', height: '55%' },
    { time: '18:00', height: '88%' },
  ];

  const wavesData = [
    { id: 'WAVE-2026-041', zone: 'Zone A-B', progress: '85%', badgeText: 'IN_PROGRESS', badgeClass: 'badge-accent' },
    { id: 'WAVE-2026-042', zone: 'Zone C-D', progress: '45%', badgeText: 'IN_PROGRESS', badgeClass: 'badge-accent' },
    { id: 'WAVE-2026-043', zone: 'Zone A', progress: '12%', badgeText: 'RELEASED', badgeClass: 'badge-info' },
  ];

  const shiftData = [
    { shift: 'Shift 1', items: '342 items', progress: '92%' },
    { shift: 'Shift 2', items: '287 items', progress: '78%' },
    { shift: 'Shift 3', items: '156 items', progress: '42%' },
    { shift: 'Shift 4', items: '401 items', progress: '98%' },
    { shift: 'Shift 5', items: '89 items', progress: '24%' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* 1. Page Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Warehouse operations overview
          </p>
        </div>
        <div
          className="text-mono text-muted"
          style={{
            fontSize: '0.85rem',
            background: 'var(--bg-card)',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            border: '1px solid var(--border-light)',
            backdropFilter: 'blur(12px)',
          }}
        >
          6 Aug 2026, 19:30
        </div>
      </header>

      {/* 2. Stats Grid (4 cards) */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Active Orders</span>
          <span className="stat-value text-accent">124</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Employees Online</span>
          <span className="stat-value">8 / 10</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Inventory Accuracy</span>
          <span className="stat-value">99.1%</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Order Velocity (24h)</span>
          <span className="stat-value">2.30 orders/min</span>
        </div>
      </div>

      {/* 3. Two-Column Section Below Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)',
          gap: '1.5rem',
        }}
      >
        {/* Left: Order Fulfillment Progress */}
        <div className="data-panel">
          <div className="data-panel-header">
            <h2 className="data-panel-title">Order Fulfillment Progress</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              className="chart-container"
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '16px',
                height: '140px',
                padding: '16px 24px',
                background: 'rgba(15, 23, 42, 0.4)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.04)',
              }}
            >
              {chartData.map((bar, index) => (
                <div
                  key={index}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    height: '100%',
                    gap: '6px',
                  }}
                >
                  <span className="text-mono text-muted" style={{ fontSize: '0.75rem' }}>
                    {bar.height}
                  </span>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '48px',
                      height: bar.height,
                      backgroundColor: '#e359ac',
                      borderRadius: '4px 4px 2px 2px',
                      boxShadow: '0 0 12px rgba(227, 89, 172, 0.35)',
                      transition: 'height 0.3s ease',
                    }}
                  />
                  <span className="text-mono text-muted" style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                    {bar.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Active Waves */}
        <div className="data-panel">
          <div className="data-panel-header">
            <h2 className="data-panel-title">Active Waves</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {wavesData.map((wave) => (
              <div key={wave.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span className="text-mono" style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                      {wave.id}
                    </span>
                    <span className="text-muted" style={{ fontSize: '0.8rem', marginLeft: '8px' }}>
                      {wave.zone}
                    </span>
                  </div>
                  <span className={wave.badgeClass}>{wave.badgeText}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: wave.progress }} />
                  </div>
                  <span className="text-mono text-muted" style={{ fontSize: '0.8rem', minWidth: '32px' }}>
                    {wave.progress}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Bottom Section: Picking Efficiency */}
      <div className="data-panel">
        <div className="data-panel-header">
          <h2 className="data-panel-title">Picking Efficiency</h2>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '1rem',
          }}
        >
          {shiftData.map((shiftItem, index) => (
            <div
              key={index}
              style={{
                background: 'rgba(15, 23, 42, 0.45)',
                border: '1px solid var(--border-light)',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{shiftItem.shift}</span>
                <span className="text-mono text-accent" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                  {shiftItem.progress}
                </span>
              </div>
              <span className="text-muted text-mono" style={{ fontSize: '0.8rem' }}>
                {shiftItem.items}
              </span>
              <div className="progress-bar" style={{ marginTop: '0.25rem' }}>
                <div
                  className="progress-bar-fill"
                  style={{ width: shiftItem.progress, backgroundColor: '#e359ac' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

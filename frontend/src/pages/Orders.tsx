import React, { useState, useEffect } from 'react';
import { Plus, Download, FileText, Layers, CheckCircle2, Clock, Activity, Box } from 'lucide-react';
import { orderService } from '../api/services';
import { Order, Wave } from '../types';

interface OrderItem {
  id: string;
  customer: string;
  items: number;
  status: 'SHIPPED' | 'PACKED' | 'SORTED' | 'IN_WAVE' | 'PENDING';
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  wave: string;
  created: string;
}

// Дані тепер підвантажуються з бекенду

export default function Orders() {
  const [activeFilter, setActiveFilter] = useState<'All' | 'Pending' | 'In Wave' | 'Shipped'>('All');
  const [orders, setOrders] = useState<Order[]>([]);
  const [waves, setWaves] = useState<Wave[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersData, wavesData] = await Promise.all([
          orderService.getOrders(),
          orderService.getWaves()
        ]);
        setOrders(ordersData);
        setWaves(wavesData);
      } catch (error) {
        console.error('Failed to fetch orders data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredOrders = orders.filter((order) => {
    if (activeFilter === 'Pending') return order.status === 'PENDING';
    if (activeFilter === 'In Wave') return order.status === 'IN_WAVE' || order.status === 'PACKED' || order.status === 'SORTED';
    if (activeFilter === 'Shipped') return order.status === 'SHIPPED';
    return true;
  });

  const getPriorityBadgeClass = (priority: Order['priority']) => {
    switch (priority) {
      case 'URGENT':
        return 'badge badge-danger';
      case 'HIGH':
        return 'badge badge-accent';
      case 'MEDIUM':
      case 'LOW':
      default:
        return 'badge badge-muted';
    }
  };

  const getStatusBadgeClass = (status: Order['status']) => {
    switch (status) {
      case 'SHIPPED':
        return 'badge badge-success';
      case 'PACKED':
      case 'IN_WAVE':
        return 'badge badge-info';
      case 'SORTED':
        return 'badge badge-accent';
      case 'PENDING':
      default:
        return 'badge badge-muted';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* 1. Page Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Layers style={{ color: '#e359ac' }} size={28} />
            Orders &amp; Waves
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Batch wave picking &amp; order fulfillment
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn-primary">
            <Plus size={18} />
            Create Wave
          </button>
          <button className="btn-ghost">
            <Download size={18} />
            Export
          </button>
        </div>
      </header>

      {/* 2. Top Section: Active Macro-Order Detail Card (Featured) */}
      <section className="data-panel" style={{ border: '1px solid rgba(227, 89, 172, 0.15)', background: 'linear-gradient(135deg, rgba(18, 24, 38, 0.85) 0%, rgba(30, 20, 45, 0.6) 100%)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', letterSpacing: '0.5px' }}>
                MACRO-ORDER #10023
              </h2>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 600 }}>
                3000 items
              </span>
            </div>
          </div>
          <span className="badge badge-accent" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
            IN_PROGRESS
          </span>
        </div>

        {/* Progress Section */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Order Progress: <strong style={{ color: '#e359ac' }}>
                {waves.length > 0 ? Math.round(waves.reduce((sum, w) => sum + w.progress, 0) / waves.length) : 0}%
              </strong>
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Calculating...
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <div
              style={{
                width: `${waves.length > 0 ? Math.round(waves.reduce((sum, w) => sum + w.progress, 0) / waves.length) : 0}%`,
                height: '100%',
                backgroundColor: '#e359ac',
                borderRadius: '8px',
                boxShadow: '0 0 15px rgba(227, 89, 172, 0.6)',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>

        {/* Waves List */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h3
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Activity size={16} style={{ color: '#e359ac' }} />
            PICKING WAVES
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {isLoading ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading waves...</div>
            ) : waves.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No waves found</div>
            ) : waves.map((wave) => (
              <div
                key={wave.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1.1rem',
                  background: wave.status === 'IN_PROGRESS' ? 'rgba(227, 89, 172, 0.04)' : 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '12px',
                  border: `1px solid ${wave.status === 'IN_PROGRESS' ? 'rgba(227, 89, 172, 0.15)' : 'rgba(255, 255, 255, 0.05)'}`,
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '180px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                    {wave.waveNumber}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Zone {wave.zone}</span>
                </div>
                <div style={{ flex: 1, minWidth: '160px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ flex: 1, height: '8px', backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${wave.progress}%`, 
                      height: '100%', 
                      backgroundColor: wave.status === 'COMPLETED' ? '#10b981' : '#e359ac', 
                      borderRadius: '4px', 
                      boxShadow: wave.status === 'COMPLETED' ? '0 0 10px rgba(16, 185, 129, 0.4)' : '0 0 10px rgba(227, 89, 172, 0.4)' 
                    }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600, minWidth: '35px', textAlign: 'right', color: wave.status === 'COMPLETED' ? '#10b981' : '#e359ac' }}>
                    {wave.progress}%
                  </span>
                </div>
                <span className={`badge ${wave.status === 'COMPLETED' ? 'badge-success' : wave.status === 'IN_PROGRESS' ? 'badge-accent' : 'badge-muted'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {wave.status === 'COMPLETED' && <CheckCircle2 size={12} />}
                  {wave.status === 'DRAFT' && <Clock size={12} />}
                  {wave.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Prominent Button */}
        <button className="btn-primary" style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem', letterSpacing: '0.5px' }}>
          <FileText size={20} />
          GENERATE SHIFT SUCCESS REPORT (PDF)
        </button>
      </section>

      {/* 3. Orders Table in .data-panel */}
      <section className="data-panel">
        {/* Panel Header with Filter Tabs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Box size={18} style={{ color: '#e359ac' }} />
            Recent Orders
          </h2>

          <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(15, 23, 42, 0.5)', padding: '0.25rem', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
            {(['All', 'Pending', 'In Wave', 'Shipped'] as const).map((tab) => (
              <button
                key={tab}
                className={`btn-ghost ${activeFilter === tab ? 'active' : ''}`}
                style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', borderRadius: '6px' }}
                onClick={() => setActiveFilter(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="wms-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Wave</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    Loading orders...
                  </td>
                </tr>
              ) : filteredOrders.length > 0 ? (
                filteredOrders.map((order) => {
                  const relatedWave = waves.find(w => w.id === order.id); // В реальному API тут буде зв'язок через order.wave_id
                  return (
                    <tr key={order.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)' }}>
                        {order.orderNumber}
                      </td>
                      <td style={{ fontWeight: 500 }}>{order.customerName}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{order.itemCount} items</td>
                      <td>
                        <span className={getStatusBadgeClass(order.status)}>
                          {order.status}
                        </span>
                      </td>
                      <td>
                        <span className={getPriorityBadgeClass(order.priority)}>
                          {order.priority}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: '#e359ac' }}>
                        WAVE-MOCK
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No orders match filter "{activeFilter}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

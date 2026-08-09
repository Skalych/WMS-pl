import React, { useState, useEffect } from 'react';
import { Plus, Download, Layers, CheckSquare, Square, Box, ArrowRight, CheckCircle2, Activity } from 'lucide-react';
import { orderService } from '../api/services';
import { Order, Wave } from '../types';

export default function Orders() {
  const [activeTab, setActiveTab] = useState<'orders' | 'waves'>('orders');
  const [activeOrderFilter, setActiveOrderFilter] = useState<'All' | 'Pending' | 'In Wave' | 'Shipped'>('All');
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [waves, setWaves] = useState<Wave[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [isCreatingWave, setIsCreatingWave] = useState(false);

  const fetchData = async (isPolling = false) => {
    try {
      if (!isPolling) setIsLoading(true);
      const [ordersData, wavesData] = await Promise.all([
        orderService.getOrders(),
        orderService.getWaves(),
      ]);
      setOrders(ordersData);
      setWaves(wavesData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      if (!isPolling) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // --- Orders Logic ---
  const filteredOrders = orders.filter((order) => {
    if (activeOrderFilter === 'Pending') return order.status === 'PENDING';
    if (activeOrderFilter === 'In Wave') return order.status === 'IN_WAVE' || order.status === 'PACKED' || order.status === 'SORTED';
    if (activeOrderFilter === 'Shipped') return order.status === 'SHIPPED';
    return true;
  });

  const getPriorityBadgeClass = (priority: Order['priority']) => {
    switch (priority) {
      case 'URGENT': return 'badge badge-danger';
      case 'HIGH': return 'badge badge-accent';
      case 'MEDIUM': return 'badge badge-info';
      case 'LOW':
      default: return 'badge badge-muted';
    }
  };

  const getOrderStatusBadgeClass = (status: Order['status']) => {
    switch (status) {
      case 'SHIPPED': return 'badge badge-active';
      case 'PACKED':
      case 'SORTED': return 'badge badge-info';
      case 'IN_WAVE': return 'badge badge-accent';
      case 'PENDING':
      default: return 'badge badge-muted';
    }
  };

  const toggleSelectOrder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOrders((prev) =>
      prev.includes(id) ? prev.filter((orderId) => orderId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const pendingOrders = filteredOrders.filter(o => o.status === 'PENDING');
    if (selectedOrders.length === pendingOrders.length && pendingOrders.length > 0) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(pendingOrders.map(o => o.id));
    }
  };

  const handleCreateWave = async () => {
    if (selectedOrders.length === 0) return;
    setIsCreatingWave(true);
    try {
      await orderService.createWave(selectedOrders);
      setSelectedOrders([]); 
      await fetchData(); 
      setActiveTab('waves'); // Auto-switch to waves tab!
    } catch (error) {
      console.error('Failed to create wave:', error);
      alert('Failed to create wave.');
    } finally {
      setIsCreatingWave(false);
    }
  };

  // --- Render Helpers ---
  const renderOrdersTab = () => (
    <>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
        {['All', 'Pending', 'In Wave', 'Shipped'].map(filter => (
          <button
            key={filter}
            className="filter-btn"
            style={{
              padding: '6px 16px',
              borderRadius: '20px',
              border: `1px solid ${activeOrderFilter === filter ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`,
              background: activeOrderFilter === filter ? 'rgba(227,89,172,0.1)' : 'transparent',
              color: activeOrderFilter === filter ? 'var(--accent)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
            onClick={() => {
              setActiveOrderFilter(filter as any);
              setSelectedOrders([]); // Clear selection on filter change
            }}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="data-panel">
        <div className="data-panel-header" style={{ padding: '16px 24px' }}>
          <h3 className="data-panel-title">Customer Orders</h3>
        </div>
        
        {isLoading && orders.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading orders...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', cursor: 'pointer' }} onClick={toggleSelectAll}>
                    {selectedOrders.length > 0 && selectedOrders.length === filteredOrders.filter(o => o.status === 'PENDING').length ? (
                      <CheckSquare size={18} className="text-accent" />
                    ) : (
                      <Square size={18} className="text-muted" />
                    )}
                  </th>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Priority</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No orders found for this filter.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(order => {
                    const isSelected = selectedOrders.includes(order.id);
                    const isSelectable = order.status === 'PENDING';
                    return (
                      <tr 
                        key={order.id} 
                        style={{ 
                          background: isSelected ? 'rgba(227,89,172,0.05)' : 'transparent',
                          cursor: isSelectable ? 'pointer' : 'default',
                          opacity: isSelectable ? 1 : 0.6
                        }}
                        onClick={(e) => isSelectable && toggleSelectOrder(order.id, e as any)}
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          {isSelectable ? (
                            <div onClick={(e) => toggleSelectOrder(order.id, e)} style={{ cursor: 'pointer' }}>
                              {isSelected ? <CheckSquare size={18} className="text-accent" /> : <Square size={18} className="text-muted" />}
                            </div>
                          ) : (
                            <Square size={18} style={{ opacity: 0.2 }} />
                          )}
                        </td>
                        <td className="text-mono" style={{ fontWeight: 600 }}>{order.orderNumber}</td>
                        <td>{order.customerName}</td>
                        <td><span className={getPriorityBadgeClass(order.priority)}>{order.priority}</span></td>
                        <td className="text-mono">{order.itemCount}</td>
                        <td><span className={getOrderStatusBadgeClass(order.status)}>{order.status}</span></td>
                        <td className="text-muted" style={{ fontSize: '0.8rem' }}>
                          {new Date(order.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Floating Action Bar */}
      {selectedOrders.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 15, 22, 0.95)',
          padding: '16px 24px',
          borderRadius: '12px',
          border: '1px solid var(--accent)',
          boxShadow: '0 10px 40px rgba(227,89,172,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          zIndex: 100,
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ready for grouping</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 600 }}><span className="text-accent">{selectedOrders.length}</span> orders selected</span>
          </div>
          <button 
            className="btn btn-primary" 
            style={{ padding: '10px 24px', fontSize: '0.9rem', boxShadow: '0 0 15px rgba(227,89,172,0.4)' }}
            onClick={handleCreateWave} 
            disabled={isCreatingWave}
          >
            {isCreatingWave ? 'Generating Tasks...' : 'Create Wave'} <ArrowRight size={16} style={{ marginLeft: '8px' }} />
          </button>
        </div>
      )}
    </>
  );

  const renderWavesTab = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
      {isLoading && waves.length === 0 ? (
        <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Loading waves...</div>
      ) : waves.length === 0 ? (
        <div style={{ padding: '40px', color: 'var(--text-muted)' }}>No waves generated yet.</div>
      ) : (
        waves.map(wave => {
          const isCompleted = wave.status === 'COMPLETED';
          const isSorting = wave.status === 'SORTING' || wave.status === 'PACKING';
          const isPending = wave.status === 'PENDING';
          
          let borderColor = 'rgba(255,255,255,0.05)';
          let badgeClass = 'badge-muted';
          let barColor = '';
          
          if (isCompleted) {
            borderColor = 'rgba(34,197,94,0.3)';
            badgeClass = 'badge-active';
            barColor = 'bg-green-500'; // or anything since progress is 100
          } else if (isSorting) {
            borderColor = 'rgba(56,189,248,0.3)';
            badgeClass = 'badge-info';
            barColor = 'cyan';
          } else if (!isPending) {
            borderColor = 'rgba(227,89,172,0.3)';
            badgeClass = 'badge-accent';
            barColor = '';
          }

          return (
            <div key={wave.id} className="data-panel" style={{ 
              border: `1px solid ${borderColor}`,
              transition: 'all 0.3s ease',
              background: isCompleted ? 'rgba(34,197,94,0.02)' : 'var(--bg-card)'
            }}>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Wave ID</span>
                    <h3 className="text-mono" style={{ fontSize: '1.2rem', marginTop: '4px' }}>WAVE-{wave.waveNumber}</h3>
                  </div>
                  <span className={`badge ${badgeClass}`}>{wave.status}</span>
                </div>
                
                <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Orders</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{wave.ordersCount}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Zone</span>
                    <span className="badge badge-muted" style={{ marginTop: '4px' }}>{wave.zone || 'MIXED'}</span>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Task Progress</span>
                    <span className="text-mono" style={{ color: isCompleted ? '#22c55e' : 'var(--text-main)' }}>{wave.progress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className={`progress-bar-fill ${barColor}`} 
                      style={{ 
                        width: `${wave.progress}%`,
                        background: isCompleted ? '#22c55e' : undefined
                      }} 
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '80px' }}>
      {/* Page Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Layers className="text-accent" size={28} />
            Operations Manager
          </h1>
          <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Group orders into waves and monitor task execution
          </p>
        </div>
        
        {/* Custom Tabs */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <button
            onClick={() => setActiveTab('orders')}
            style={{
              padding: '8px 24px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'orders' ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: activeTab === 'orders' ? 'white' : 'var(--text-muted)',
              fontWeight: activeTab === 'orders' ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Box size={16} /> Orders Queue
          </button>
          <button
            onClick={() => setActiveTab('waves')}
            style={{
              padding: '8px 24px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'waves' ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: activeTab === 'waves' ? 'white' : 'var(--text-muted)',
              fontWeight: activeTab === 'waves' ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Activity size={16} /> Wave Management
            {waves.filter(w => w.status !== 'COMPLETED').length > 0 && (
              <span style={{ 
                background: 'var(--accent)', 
                color: 'white', 
                fontSize: '0.65rem', 
                padding: '2px 6px', 
                borderRadius: '10px',
                fontWeight: 700 
              }}>
                {waves.filter(w => w.status !== 'COMPLETED').length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Tab Content */}
      <div style={{ animation: 'fadeIn 0.3s ease' }}>
        {activeTab === 'orders' ? renderOrdersTab() : renderWavesTab()}
      </div>

    </div>
  );
}

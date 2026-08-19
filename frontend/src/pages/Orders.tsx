import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Layers, CheckSquare, Square, Box, ArrowRight, Activity } from 'lucide-react';
import { orderService } from '../api/services';
import { Order, Wave, WaveStatus } from '../types';

type OrderFilter = 'All' | 'Pending' | 'In Wave' | 'Shipped';

export default function Orders() {
  const { t } = useTranslation();
  const filterLabels: Record<OrderFilter, string> = {
    All: t('orders.filterAll'),
    Pending: t('orders.filterPending'),
    'In Wave': t('orders.filterInWave'),
    Shipped: t('orders.filterShipped'),
  };
  const [activeTab, setActiveTab] = useState<'orders' | 'waves'>('orders');
  const [activeOrderFilter, setActiveOrderFilter] = useState<OrderFilter>('All');
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
    const interval = setInterval(() => fetchData(true), 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredOrders = orders.filter((order) => {
    if (activeOrderFilter === 'Pending') return order.status === 'PENDING';
    if (activeOrderFilter === 'In Wave') {
      return order.status === 'IN_WAVE' || order.status === 'PACKED' || order.status === 'SORTED';
    }
    if (activeOrderFilter === 'Shipped') return order.status === 'SHIPPED';
    return true;
  });

  const getPriorityBadgeClass = (priority: Order['priority']) => {
    switch (priority) {
      case 'URGENT':
        return 'badge badge-danger';
      case 'HIGH':
        return 'badge badge-accent';
      case 'MEDIUM':
        return 'badge badge-info';
      default:
        return 'badge badge-muted';
    }
  };

  const getOrderStatusBadgeClass = (status: Order['status']) => {
    switch (status) {
      case 'SHIPPED':
        return 'badge badge-active';
      case 'PACKED':
      case 'SORTED':
        return 'badge badge-info';
      case 'IN_WAVE':
        return 'badge badge-accent';
      default:
        return 'badge badge-muted';
    }
  };

  const toggleSelectOrder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOrders((prev) =>
      prev.includes(id) ? prev.filter((orderId) => orderId !== id) : [...prev, id]
    );
  };

  const pendingInView = filteredOrders.filter((o) => o.status === 'PENDING');
  const allPendingSelected =
    pendingInView.length > 0 && selectedOrders.length === pendingInView.length;

  const toggleSelectAll = () => {
    if (allPendingSelected) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(pendingInView.map((o) => o.id));
    }
  };

  const handleCreateWave = async () => {
    if (selectedOrders.length === 0) return;
    setIsCreatingWave(true);
    try {
      await orderService.createWave(selectedOrders);
      setSelectedOrders([]);
      await fetchData();
      setActiveTab('waves');
    } catch (error) {
      console.error('Failed to create wave:', error);
      alert(t('orders.createWaveFailed'));
    } finally {
      setIsCreatingWave(false);
    }
  };

  const activeWaveCount = waves.filter((w) => w.status !== WaveStatus.COMPLETED && w.status !== WaveStatus.CANCELLED).length;

  const renderOrdersTab = () => (
    <>
      <div className="filter-pills">
        {(['All', 'Pending', 'In Wave', 'Shipped'] as OrderFilter[]).map((filter) => (
          <button
            key={filter}
            type="button"
            className={`filter-pill ${activeOrderFilter === filter ? 'active' : ''}`}
            onClick={() => {
              setActiveOrderFilter(filter);
              setSelectedOrders([]);
            }}
          >
            {filterLabels[filter]}
          </button>
        ))}
      </div>

      <div className="data-panel">
        <div className="data-panel-header">
          <h3 className="data-panel-title">{t('orders.customerOrders')}</h3>
        </div>

        {isLoading && orders.length === 0 ? (
          <div className="panel-empty">{t('orders.loadingOrders')}</div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <button type="button" className="table-check-btn" onClick={toggleSelectAll} aria-label={t('orders.selectAllPending')}>
                      {allPendingSelected ? (
                        <CheckSquare size={18} className="text-accent" />
                      ) : (
                        <Square size={18} className="text-muted" />
                      )}
                    </button>
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
                    <td colSpan={7} className="panel-empty">
                      {t('orders.noOrders')}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const isSelected = selectedOrders.includes(order.id);
                    const isSelectable = order.status === 'PENDING';
                    return (
                      <tr
                        key={order.id}
                        className={isSelected ? 'row-selected' : undefined}
                        style={{ cursor: isSelectable ? 'pointer' : 'default', opacity: isSelectable ? 1 : 0.65 }}
                        onClick={(e) => isSelectable && toggleSelectOrder(order.id, e)}
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          {isSelectable ? (
                            <button
                              type="button"
                              className="table-check-btn"
                              onClick={(e) => toggleSelectOrder(order.id, e)}
                            >
                              {isSelected ? (
                                <CheckSquare size={18} className="text-accent" />
                              ) : (
                                <Square size={18} className="text-muted" />
                              )}
                            </button>
                          ) : (
                            <Square size={18} style={{ opacity: 0.2 }} />
                          )}
                        </td>
                        <td className="text-mono">{order.orderNumber}</td>
                        <td>{order.customerName}</td>
                        <td>
                          <span className={getPriorityBadgeClass(order.priority)}>{order.priority}</span>
                        </td>
                        <td className="text-mono">{order.itemCount}</td>
                        <td>
                          <span className={getOrderStatusBadgeClass(order.status)}>{order.status}</span>
                        </td>
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

      {selectedOrders.length > 0 && (
        <div className="wave-action-bar">
          <div>
            <span className="wave-action-label">{t('orders.readyGrouping')}</span>
            <span className="wave-action-count">
              <span className="text-accent">{selectedOrders.length}</span> {t('orders.ordersSelected')}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCreateWave}
            disabled={isCreatingWave}
          >
            {isCreatingWave ? t('orders.creating') : t('orders.createWave')}
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </>
  );

  const renderWavesTab = () => (
    <div className="wave-grid">
      {isLoading && waves.length === 0 ? (
        <div className="panel-empty">{t('orders.loadingWaves')}</div>
      ) : waves.length === 0 ? (
        <div className="panel-empty">{t('orders.noWaves')}</div>
      ) : (
        waves.map((wave) => {
          const isCompleted = wave.status === WaveStatus.COMPLETED;
          const isSorting = wave.status === WaveStatus.SORTING;
          const isActive =
            wave.status === WaveStatus.IN_PROGRESS ||
            wave.status === WaveStatus.RELEASED ||
            wave.status === WaveStatus.PICKED;

          let cardClass = 'wave-card';
          if (isCompleted) cardClass += ' wave-card--done';
          else if (isSorting) cardClass += ' wave-card--sorting';
          else if (isActive) cardClass += ' wave-card--active';

          return (
            <div key={wave.id} className={`data-panel ${cardClass}`}>
              <div className="wave-card-body">
                <div className="wave-card-header">
                  <div>
                    <span className="wave-card-label">{t('orders.wave')}</span>
                    <h3 className="text-mono">WAVE-{wave.waveNumber}</h3>
                  </div>
                  <span className={`badge ${isCompleted ? 'badge-active' : isSorting ? 'badge-info' : isActive ? 'badge-accent' : 'badge-muted'}`}>
                    {wave.status}
                  </span>
                </div>

                <div className="wave-card-meta">
                  <div>
                    <span className="wave-card-meta-label">Orders</span>
                    <span className="wave-card-meta-value">{wave.ordersCount}</span>
                  </div>
                  <div>
                    <span className="wave-card-meta-label">Zone</span>
                    <span className="badge badge-muted">{wave.zone || 'Mixed'}</span>
                  </div>
                </div>

                <div>
                  <div className="flex-between" style={{ fontSize: '0.8rem', marginBottom: 8 }}>
                    <span className="text-muted">{t('orders.progress')}</span>
                    <span className="text-mono">{wave.progress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className={`progress-bar-fill ${isSorting ? 'cyan' : ''}`}
                      style={{
                        width: `${wave.progress}%`,
                        background: isCompleted ? 'var(--color-success)' : undefined,
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
    <div className="page-stack page-stack--actions">
      <header className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Layers className="text-accent" size={24} />
            {t('orders.title')}
          </h1>
          <p className="page-subtitle">{t('orders.subtitle')}</p>
        </div>

        <div className="tab-switcher">
          <button
            type="button"
            className={`tab-switcher-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <Box size={16} />
            {t('orders.ordersTab')}
          </button>
          <button
            type="button"
            className={`tab-switcher-btn ${activeTab === 'waves' ? 'active' : ''}`}
            onClick={() => setActiveTab('waves')}
          >
            <Activity size={16} />
            {t('orders.wavesTab')}
            {activeWaveCount > 0 && <span className="tab-badge">{activeWaveCount}</span>}
          </button>
        </div>
      </header>

      {activeTab === 'orders' ? renderOrdersTab() : renderWavesTab()}
    </div>
  );
}

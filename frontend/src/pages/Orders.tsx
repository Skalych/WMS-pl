import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Layers, CheckSquare, Square, ArrowRight } from 'lucide-react';
import { orderService } from '../api/services';
import { Order } from '../types';

type OrderFilter = 'All' | 'Pending' | 'In Wave' | 'Shipped';

export default function Orders() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const filterLabels: Record<OrderFilter, string> = {
    All: t('orders.filterAll'),
    Pending: t('orders.filterPending'),
    'In Wave': t('orders.filterInWave'),
    Shipped: t('orders.filterShipped'),
  };
  const [activeOrderFilter, setActiveOrderFilter] = useState<OrderFilter>('All');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [isCreatingWave, setIsCreatingWave] = useState(false);

  const fetchData = async (isPolling = false) => {
    try {
      if (!isPolling) setIsLoading(true);
      const ordersData = await orderService.getOrders();
      setOrders(ordersData);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
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
      navigate('/waves');
    } catch (error) {
      console.error('Failed to create wave:', error);
      alert(t('orders.createWaveFailed'));
    } finally {
      setIsCreatingWave(false);
    }
  };

  return (
    <div className="page-stack page-stack--actions">
      <header className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Layers className="text-accent" size={24} />
            {t('orders.ordersTab')}
          </h1>
          <p className="page-subtitle">{t('orders.subtitle')}</p>
        </div>
      </header>

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
    </div>
  );
}

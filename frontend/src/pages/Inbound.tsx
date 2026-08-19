import { useEffect, useState } from 'react';
import { inboundService, inventoryService } from '../api/services';
import { InboundShipment, InboundStatus, InventoryItem } from '../types';
import { PackagePlus, Truck, CheckCircle, X, Plus } from 'lucide-react';

function inboundStatusBadge(status: InboundStatus): string {
  switch (status) {
    case InboundStatus.RECEIVED:
    case InboundStatus.COMPLETED:
      return 'badge badge-active';
    case InboundStatus.PENDING:
    case InboundStatus.IN_RECEIVING:
      return 'badge badge-warning';
    case InboundStatus.CANCELLED:
      return 'badge badge-danger';
    default:
      return 'badge badge-muted';
  }
}

export default function Inbound() {
  const [shipments, setShipments] = useState<InboundShipment[]>([]);
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [dockNumber, setDockNumber] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [expectedQty, setExpectedQty] = useState(10);
  const [formItems, setFormItems] = useState<{ product_id: string; expected_quantity: number; label: string }[]>([]);
  const [error, setError] = useState('');
  const [receivingId, setReceivingId] = useState<string | null>(null);

  const pendingCount = shipments.filter((s) => s.status === InboundStatus.PENDING).length;

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [shipmentsData, inventoryData] = await Promise.all([
        inboundService.getShipments(),
        inventoryService.getInventory(1, 100),
      ]);
      setShipments(shipmentsData);
      setProducts(inventoryData.items);
      setError('');
    } catch (e) {
      console.error(e);
      setError('Failed to load inbound data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addFormItem = () => {
    if (!selectedProductId || expectedQty <= 0) return;
    const product = products.find((p) => p.id === selectedProductId);
    setFormItems((prev) => [
      ...prev,
      {
        product_id: selectedProductId,
        expected_quantity: expectedQty,
        label: product ? `${product.sku} — ${product.productName}` : selectedProductId,
      },
    ]);
    setSelectedProductId('');
    setExpectedQty(10);
  };

  const handleCreate = async () => {
    if (!supplierName.trim() || formItems.length === 0) {
      setError('Supplier name and at least one line item are required');
      return;
    }
    setError('');
    try {
      await inboundService.createShipment(
        supplierName.trim(),
        dockNumber.trim(),
        formItems.map(({ product_id, expected_quantity }) => ({ product_id, expected_quantity }))
      );
      setShowForm(false);
      setSupplierName('');
      setDockNumber('');
      setFormItems([]);
      await loadData();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err.response?.data?.detail || 'Failed to create shipment');
    }
  };

  const handleReceive = async (id: string) => {
    setReceivingId(id);
    try {
      await inboundService.receiveShipment(id);
      await loadData();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err.response?.data?.detail || 'Failed to receive shipment');
    } finally {
      setReceivingId(null);
    }
  };

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Inbound</h1>
          <p className="page-subtitle">Receive supplier shipments into the warehouse</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <PackagePlus size={16} />
          {showForm ? 'Cancel' : 'New shipment'}
        </button>
      </header>

      <div className="stats-grid inbound-stats">
        <div className="stat-card">
          <span className="stat-label">Total shipments</span>
          <span className="stat-value">{isLoading ? '…' : shipments.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Awaiting receive</span>
          <span className="stat-value accent">{isLoading ? '…' : pendingCount}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Products in catalog</span>
          <span className="stat-value">{isLoading ? '…' : products.length}</span>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="data-panel inbound-form-panel">
          <div className="data-panel-header">
            <h3 className="data-panel-title">Create inbound shipment</h3>
          </div>
          <div className="inbound-form-body">
            <div className="form-row">
              <div className="form-field">
                <label className="form-label" htmlFor="supplier">Supplier</label>
                <input
                  id="supplier"
                  className="input-field"
                  placeholder="Supplier name"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="dock">Dock</label>
                <input
                  id="dock"
                  className="input-field"
                  placeholder="Dock number (optional)"
                  value={dockNumber}
                  onChange={(e) => setDockNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row form-row--items">
              <div className="form-field form-field--grow">
                <label className="form-label" htmlFor="product">Product</label>
                <select
                  id="product"
                  className="select-field"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                >
                  <option value="">Select product…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.productName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field form-field--qty">
                <label className="form-label" htmlFor="qty">Qty</label>
                <input
                  id="qty"
                  type="number"
                  min={1}
                  className="input-field"
                  value={expectedQty}
                  onChange={(e) => setExpectedQty(Number(e.target.value))}
                />
              </div>
              <button type="button" className="btn btn-ghost" onClick={addFormItem}>
                <Plus size={16} />
                Add line
              </button>
            </div>

            {formItems.length > 0 && (
              <ul className="inbound-line-list">
                {formItems.map((item, idx) => (
                  <li key={idx} className="inbound-line-item">
                    <span>{item.label}</span>
                    <span className="text-mono">× {item.expected_quantity}</span>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label="Remove line"
                      onClick={() => setFormItems((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <button type="button" className="btn btn-primary" onClick={handleCreate} disabled={formItems.length === 0}>
              Create shipment
            </button>
          </div>
        </div>
      )}

      <div className="data-panel">
        <div className="data-panel-header">
          <h3 className="data-panel-title">Shipments</h3>
        </div>
        {isLoading ? (
          <div className="panel-empty">Loading shipments…</div>
        ) : shipments.length === 0 ? (
          <div className="panel-empty">No inbound shipments yet</div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Shipment</th>
                  <th>Supplier</th>
                  <th>Dock</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shipments.map((s) => (
                  <tr key={s.id}>
                    <td className="text-mono">{s.shipmentNumber}</td>
                    <td>{s.supplierName}</td>
                    <td className="text-muted">{s.dockNumber || '—'}</td>
                    <td className="text-mono">{s.itemsCount}</td>
                    <td>
                      <span className={inboundStatusBadge(s.status)}>{s.status}</span>
                    </td>
                    <td className="text-muted" style={{ fontSize: '0.85rem' }}>
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      {s.status === InboundStatus.PENDING && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={receivingId === s.id}
                          onClick={() => handleReceive(s.id)}
                        >
                          <CheckCircle size={14} />
                          {receivingId === s.id ? 'Receiving…' : 'Receive'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="page-hint">
        <Truck size={16} />
        Receiving adds stock to the receiving zone and logs inventory transactions.
      </p>
    </div>
  );
}

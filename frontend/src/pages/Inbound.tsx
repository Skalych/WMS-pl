import React, { useEffect, useState } from 'react';
import { inboundService, inventoryService } from '../api/services';
import { InboundShipment, InboundStatus, InventoryItem } from '../types';
import { PackagePlus, Truck, CheckCircle } from 'lucide-react';

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

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [shipmentsData, inventoryData] = await Promise.all([
        inboundService.getShipments(),
        inventoryService.getInventory(1, 100),
      ]);
      setShipments(shipmentsData);
      setProducts(inventoryData.items);
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
  };

  const handleCreate = async () => {
    if (!supplierName || formItems.length === 0) {
      setError('Supplier name and at least one item are required');
      return;
    }
    setError('');
    try {
      await inboundService.createShipment(
        supplierName,
        dockNumber,
        formItems.map(({ product_id, expected_quantity }) => ({ product_id, expected_quantity }))
      );
      setShowForm(false);
      setSupplierName('');
      setDockNumber('');
      setFormItems([]);
      await loadData();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to create shipment');
    }
  };

  const handleReceive = async (id: string) => {
    try {
      await inboundService.receiveShipment(id);
      await loadData();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to receive shipment');
    }
  };

  const statusColor = (status: InboundStatus) => {
    if (status === InboundStatus.RECEIVED || status === InboundStatus.COMPLETED) return '#10b981';
    if (status === InboundStatus.PENDING) return '#f59e0b';
    return '#94a3b8';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header className="top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Inbound Receipts</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Receive supplier shipments into warehouse
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowForm(!showForm)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <PackagePlus size={16} />
          New Shipment
        </button>
      </header>

      {error && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#f87171' }}>
          {error}
        </div>
      )}

      {showForm && (
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ margin: 0, color: '#fff' }}>Create Inbound Shipment</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <input
              placeholder="Supplier name"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
            <input
              placeholder="Dock number (optional)"
              value={dockNumber}
              onChange={(e) => setDockNumber(e.target.value)}
              style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              style={{ flex: 1, minWidth: '200px', padding: '0.75rem', borderRadius: '8px', background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            >
              <option value="">Select product...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.sku} — {p.productName}</option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={expectedQty}
              onChange={(e) => setExpectedQty(Number(e.target.value))}
              style={{ width: '100px', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
            <button className="btn-secondary" onClick={addFormItem}>Add item</button>
          </div>
          {formItems.length > 0 && (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {formItems.map((item, idx) => (
                <li key={idx} style={{ padding: '0.5rem 0', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {item.label} × {item.expected_quantity}
                </li>
              ))}
            </ul>
          )}
          <button className="btn-primary" onClick={handleCreate}>Create Shipment</button>
        </div>
      )}

      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading shipments...</div>
        ) : shipments.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No inbound shipments yet</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Shipment', 'Supplier', 'Dock', 'Items', 'Status', 'Created', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '1rem', color: '#fff', fontFamily: 'var(--font-mono)' }}>{s.shipmentNumber}</td>
                  <td style={{ padding: '1rem', color: '#fff' }}>{s.supplierName}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{s.dockNumber || '—'}</td>
                  <td style={{ padding: '1rem', color: '#fff' }}>{s.itemsCount}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ color: statusColor(s.status), fontWeight: 600, fontSize: '0.85rem' }}>{s.status}</span>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {new Date(s.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {s.status === InboundStatus.PENDING && (
                      <button
                        onClick={() => handleReceive(s.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', padding: '0.4rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        <CheckCircle size={14} /> Receive
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <Truck size={16} />
        Receiving adds stock to the receiving zone and logs inventory transactions.
      </div>
    </div>
  );
}

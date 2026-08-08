import React, { useState, useEffect } from 'react';
import { inventoryService } from '../api/services';
import { InventoryItem } from '../types';
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Package 
} from 'lucide-react';

// Дані тепер підвантажуються з бекенду

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const data = await inventoryService.getInventory();
        setInventoryItems(data);
      } catch (error) {
        console.error('Failed to fetch inventory:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInventory();
  }, []);

  const toggleSelectItem = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === inventoryItems.length && inventoryItems.length > 0) {
      setSelectedItems([]);
    } else {
      setSelectedItems(inventoryItems.map((item) => item.id));
    }
  };

  const filteredItems = inventoryItems.filter(item => 
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.productName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* 1. Page Header */}
      <header className="top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Inventory</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Product catalog & stock levels
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search by SKU or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.3rem', width: '260px' }}
            />
          </div>
          <button className="btn-ghost">
            <Filter size={16} />
            Filter
          </button>
        </div>
      </header>

      {/* 2. Stats Row (4 stat cards) */}
      <div className="dashboard-grid">
        <div className="card">
          <div className="card-title">Total SKUs</div>
          <div className="card-value" style={{ color: 'var(--text-main)' }}>{isLoading ? '...' : inventoryItems.length}</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.4rem' }}>
            Active catalog items
          </p>
        </div>

        <div className="card">
          <div className="card-title">In Stock</div>
          <div className="card-value" style={{ color: 'var(--success)' }}>
            {isLoading ? '...' : inventoryItems.filter(i => i.status === 'in_stock').length}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.4rem' }}>
            Optimal stock levels
          </p>
        </div>

        <div className="card">
          <div className="card-title">Low Stock</div>
          <div className="card-value" style={{ color: 'var(--warning)' }}>
            {isLoading ? '...' : inventoryItems.filter(i => i.status === 'low_stock').length}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.4rem' }}>
            Reorder threshold reached
          </p>
        </div>

        <div className="card">
          <div className="card-title">Out of Stock</div>
          <div className="card-value" style={{ color: 'var(--danger)' }}>
            {isLoading ? '...' : inventoryItems.filter(i => i.status === 'out_of_stock').length}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.4rem' }}>
            Requires immediate restock
          </p>
        </div>
      </div>

      {/* 3. Main Data Table in .data-panel */}
      <div className="data-panel">
        {/* Panel Header */}
        <div className="data-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package size={18} style={{ color: '#e359ac' }} />
            Stock Levels
          </h3>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn-ghost">
              Sorting ▾
            </button>
            <button className="btn-ghost">
              Category: All ▾
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="wms-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    className="wms-checkbox"
                    checked={selectedItems.length === inventoryItems.length && inventoryItems.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>SKU</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Location</th>
                <th>Quantity</th>
                <th>Reserved</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading inventory...</td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No inventory items found.</td>
                </tr>
              ) : filteredItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      type="checkbox"
                      className="wms-checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => toggleSelectItem(item.id)}
                    />
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: '#e359ac', fontWeight: 600 }}>
                    {item.sku}
                  </td>
                  <td style={{ fontWeight: 600 }}>{item.productName}</td>
                  <td>{item.category}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{item.location}</td>
                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600 }}>{item.quantity}</span>
                      {item.status === 'low_stock' && (
                        <div
                          title="Low Stock Warning"
                          style={{
                            width: '40px',
                            height: '4px',
                            backgroundColor: 'rgba(245, 158, 11, 0.2)',
                            borderRadius: '2px',
                            overflow: 'hidden',
                            display: 'inline-block'
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.min(100, (item.quantity / 120) * 100)}%`,
                              height: '100%',
                              backgroundColor: 'var(--warning)',
                              borderRadius: '2px'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td>{item.reservedQuantity}</td>
                  <td>
                    {item.status === 'in_stock' && (
                      <span className="badge badge-success">In Stock</span>
                    )}
                    {item.status === 'low_stock' && (
                      <span className="badge badge-warning">Low Stock</span>
                    )}
                    {item.status === 'out_of_stock' && (
                      <span className="badge badge-danger">Out of Stock</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 4. Footer of the table panel */}
        <div 
          className="data-panel-footer"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-light)',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Showing {filteredItems.length} of {inventoryItems.length}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button className="btn-ghost" style={{ padding: '0.4rem 0.7rem' }}>
              <ChevronLeft size={16} />
            </button>
            <button 
              className="btn-ghost active" 
              style={{ 
                padding: '0.4rem 0.75rem', 
                backgroundColor: '#e359ac', 
                borderColor: '#e359ac', 
                color: '#ffffff',
                boxShadow: '0 0 10px rgba(227, 89, 172, 0.4)' 
              }}
            >
              1
            </button>
            <button className="btn-ghost" style={{ padding: '0.4rem 0.75rem' }}>
              2
            </button>
            <button className="btn-ghost" style={{ padding: '0.4rem 0.75rem' }}>
              3
            </button>
            <span style={{ color: 'var(--text-muted)', padding: '0 0.3rem', fontSize: '0.9rem' }}>...</span>
            <button className="btn-ghost" style={{ padding: '0.4rem 0.75rem' }}>
              156
            </button>
            <button className="btn-ghost" style={{ padding: '0.4rem 0.7rem' }}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

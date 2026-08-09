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
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchInventory = async () => {
      setIsLoading(true);
      try {
        const data = await inventoryService.getInventory(currentPage, itemsPerPage, searchTerm, statusFilter);
        setInventoryItems(data.items);
        setTotalItems(data.total);
      } catch (error) {
        console.error('Failed to fetch inventory:', error);
      } finally {
        setIsLoading(false);
      }
    };
    // Fetch with a slight debounce if typing in search
    const timer = setTimeout(() => {
      fetchInventory();
    }, 300);
    return () => clearTimeout(timer);
  }, [currentPage, searchTerm, statusFilter]);

  // Handle local filtering if we want to visually filter before the next fetch returns
  // but since we are server-side searching, we just display what's returned.
  const filteredItems = inventoryItems;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const toggleSelectItem = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredItems.length && filteredItems.length > 0) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map((item) => item.id));
    }
  };

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
          <div style={{ position: 'relative' }}>
            <Filter size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-main)', pointerEvents: 'none' }} />
            <select 
              className="dropdown-btn" 
              style={{ paddingLeft: '34px', appearance: 'none' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Filter: All Statuses</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>
        </div>
      </header>

      {/* 2. Stats Row (4 stat cards) */}
      <div className="dashboard-grid">
        <div className="card">
          <div className="card-title">Total SKUs</div>
          <div className="card-value" style={{ color: 'var(--text-main)' }}>{isLoading ? '...' : totalItems}</div>
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
      <div className="data-panel" style={{ 
        padding: '24px',
        background: 'linear-gradient(135deg, rgba(15, 15, 22, 0.9) 0%, rgba(30, 20, 45, 0.4) 100%)',
        border: '1px solid rgba(227, 89, 172, 0.15)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
      }}>
        {/* Panel Header */}
        <div className="data-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
            <Package size={20} style={{ color: '#e359ac', filter: 'drop-shadow(0 0 8px rgba(227,89,172,0.6))' }} />
            Stock Levels
          </h3>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="dropdown-btn">
              Sorting ▾
            </button>
            <button className="dropdown-btn">
              Category: All ▾
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="wms-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ width: '40px', padding: '0 1rem' }}>
                  <input
                    type="checkbox"
                    className="wms-checkbox"
                    checked={selectedItems.length === inventoryItems.length && inventoryItems.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th style={{ padding: '0 1rem', textAlign: 'left', fontWeight: 600 }}>SKU</th>
                <th style={{ padding: '0 1rem', textAlign: 'left', fontWeight: 600 }}>Product Name</th>
                <th style={{ padding: '0 1rem', textAlign: 'left', fontWeight: 600 }}>Category</th>
                <th style={{ padding: '0 1rem', textAlign: 'left', fontWeight: 600 }}>Location</th>
                <th style={{ padding: '0 1rem', textAlign: 'left', fontWeight: 600 }}>Quantity</th>
                <th style={{ padding: '0 1rem', textAlign: 'left', fontWeight: 600 }}>Reserved</th>
                <th style={{ padding: '0 1rem', textAlign: 'left', fontWeight: 600 }}>Status</th>
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
                <tr key={item.id} style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', transition: 'background-color 0.2s', border: '1px solid transparent' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(227, 89, 172, 0.05)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}>
                  <td style={{ padding: '1rem', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px' }}>
                    <input
                      type="checkbox"
                      className="wms-checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => toggleSelectItem(item.id)}
                    />
                  </td>
                  <td style={{ padding: '1rem', fontFamily: 'var(--font-mono)', color: '#38bdf8', fontWeight: 600, letterSpacing: '0.5px' }}>
                    {item.sku}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>{item.productName}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{item.category}</td>
                  <td style={{ padding: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: '#e359ac', letterSpacing: '1px' }}>
                    <div style={{ display: 'inline-flex', padding: '0.2rem 0.5rem', background: 'rgba(227,89,172,0.1)', borderRadius: '4px', border: '1px solid rgba(227,89,172,0.2)' }}>
                      {item.location}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)' }}>{item.quantity}</span>
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
                              borderRadius: '2px',
                              boxShadow: '0 0 5px var(--warning)'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>{item.reservedQuantity}</td>
                  <td style={{ padding: '1rem', borderTopRightRadius: '8px', borderBottomRightRadius: '8px' }}>
                    {item.status === 'in_stock' && (
                      <span className="badge badge-success" style={{ filter: 'drop-shadow(0 0 5px rgba(34,197,94,0.3))' }}>In Stock</span>
                    )}
                    {item.status === 'low_stock' && (
                      <span className="badge badge-warning" style={{ filter: 'drop-shadow(0 0 5px rgba(245,158,11,0.3))' }}>Low Stock</span>
                    )}
                    {item.status === 'out_of_stock' && (
                      <span className="badge badge-danger" style={{ filter: 'drop-shadow(0 0 5px rgba(239,68,68,0.3))' }}>Out of Stock</span>
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
            Showing {filteredItems.length} of {totalItems} (Page {currentPage} of {totalPages})
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button 
              className="icon-btn" 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              className="icon-btn" 
              style={{ 
                padding: '0.4rem 0.75rem', 
                backgroundColor: '#e359ac', 
                borderColor: '#e359ac', 
                color: '#ffffff',
                boxShadow: '0 0 10px rgba(227, 89, 172, 0.4)' 
              }}
            >
              {currentPage}
            </button>
            <button 
              className="icon-btn" 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

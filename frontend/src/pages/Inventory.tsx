import { useState, useEffect } from 'react';
import { inventoryService } from '../api/services';
import { InventoryItem } from '../types';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Package
} from 'lucide-react';

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    const fetchInventory = async () => {
      setIsLoading(true);
      try {
        const data = await inventoryService.getInventory(currentPage, itemsPerPage, searchTerm, statusFilter, categoryFilter, sortBy);
        setInventoryItems(data.items);
        setTotalItems(data.total);
      } catch (error) {
        console.error('Failed to fetch inventory:', error);
      } finally {
        setIsLoading(false);
      }
    };
    const timer = setTimeout(() => {
      fetchInventory();
    }, 300);
    return () => clearTimeout(timer);
  }, [currentPage, searchTerm, statusFilter, categoryFilter, sortBy]);

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

  const inStockCount = inventoryItems.filter(i => i.status === 'in_stock').length;
  const lowStockCount = inventoryItems.filter(i => i.status === 'low_stock').length;
  const outOfStockCount = inventoryItems.filter(i => i.status === 'out_of_stock').length;

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">Product catalog & stock levels</p>
        </div>

        <div className="header-actions">
          <div className="input-search-wrap">
            <Search size={16} className="input-search-icon" />
            <input
              type="text"
              className="input-field"
              placeholder="Search by SKU or name…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="select-with-icon">
            <Filter size={16} className="select-icon" />
            <select
              className="select-field"
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

      <div className="dashboard-grid">
        <div className="stat-card">
          <span className="stat-label">Total SKUs</span>
          <div className="stat-value">{isLoading ? '…' : totalItems}</div>
          <p className="stat-card-footnote">Active catalog items</p>
        </div>

        <div className="stat-card">
          <span className="stat-label">In Stock</span>
          <div className="stat-value text-success">{isLoading ? '…' : inStockCount}</div>
          <p className="stat-card-footnote">Optimal stock levels</p>
        </div>

        <div className="stat-card">
          <span className="stat-label">Low Stock</span>
          <div className="stat-value text-warning">{isLoading ? '…' : lowStockCount}</div>
          <p className="stat-card-footnote">Reorder threshold reached</p>
        </div>

        <div className="stat-card">
          <span className="stat-label">Out of Stock</span>
          <div className="stat-value text-danger">{isLoading ? '…' : outOfStockCount}</div>
          <p className="stat-card-footnote">Requires immediate restock</p>
        </div>
      </div>

      <div className="data-panel">
        <div className="data-panel-header">
          <h3 className="data-panel-title">
            <Package size={18} className="text-accent" />
            Stock Levels
          </h3>
          <div className="header-actions">
            <select
              className="select-field"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Sort: Newest</option>
              <option value="qty_desc">Qty: High to Low</option>
              <option value="qty_asc">Qty: Low to High</option>
              <option value="sku_asc">SKU: A–Z</option>
            </select>

            <select
              className="select-field"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">Category: All</option>
              <option value="Apparel">Apparel</option>
              <option value="Footwear">Footwear</option>
              <option value="Accessories">Accessories</option>
              <option value="Outerwear">Outerwear</option>
              <option value="Sportswear">Sportswear</option>
            </select>
          </div>
        </div>

        <div className="table-scroll">
          <table className="data-table">
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
                  <td colSpan={8} className="panel-empty">Loading inventory…</td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="panel-empty">No inventory items found.</td>
                </tr>
              ) : filteredItems.map((item) => (
                <tr key={item.id} className={selectedItems.includes(item.id) ? 'row-selected' : undefined}>
                  <td>
                    <input
                      type="checkbox"
                      className="wms-checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => toggleSelectItem(item.id)}
                    />
                  </td>
                  <td className="text-info text-mono">{item.sku}</td>
                  <td style={{ fontWeight: 600 }}>{item.productName}</td>
                  <td className="text-muted">{item.category}</td>
                  <td>
                    <span className="location-tag">{item.location}</span>
                  </td>
                  <td>
                    <div className="header-actions">
                      <span style={{ fontWeight: 700 }}>{item.quantity}</span>
                      {item.status === 'low_stock' && (
                        <div className="qty-bar" title="Low stock warning">
                          <div
                            className="qty-bar-fill"
                            style={{ width: `${Math.min(100, (item.quantity / 120) * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="text-muted">{item.reservedQuantity}</td>
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

        <div className="data-panel-footer">
          <div className="data-panel-footer-meta">
            Showing {filteredItems.length} of {totalItems} (Page {currentPage} of {totalPages})
          </div>

          <div className="pagination-controls">
            <button
              type="button"
              className="icon-btn"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} />
            </button>
            <button type="button" className="icon-btn pagination-btn-active">
              {currentPage}
            </button>
            <button
              type="button"
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

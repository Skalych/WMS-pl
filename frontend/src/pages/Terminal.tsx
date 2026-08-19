import { useCallback, useEffect, useRef, useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, LogOut, MapPin, Package, RefreshCw, ScanLine } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { terminalService } from '../api/services';
import { TerminalTask } from '../types';

export default function TerminalPage() {
  const { user, logout } = useAuth();
  const [task, setTask] = useState<TerminalTask | null>(null);
  const [noTask, setNoTask] = useState(false);
  const [loading, setLoading] = useState(true);
  const [barcode, setBarcode] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadTask = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const next = await terminalService.getNextTask();
      setTask(next);
      setNoTask(!next);
    } catch {
      setMessage({ type: 'error', text: 'Could not load task' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  useEffect(() => {
    if (!loading && task) {
      inputRef.current?.focus();
    }
  }, [loading, task]);

  const handleScan = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!task || !barcode.trim() || scanning) return;

    setScanning(true);
    setMessage(null);
    try {
      const result = await terminalService.scan(task.taskId, barcode.trim(), quantity);
      setBarcode('');
      if (result.task_completed) {
        setMessage({ type: 'success', text: 'Task completed' });
        await loadTask();
      } else {
        setMessage({ type: 'success', text: `Picked ${quantity} — ${result.quantity_picked} total on line` });
        const updated = await terminalService.getNextTask();
        setTask(updated);
        setNoTask(!updated);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setMessage({
        type: 'error',
        text: axiosErr.response?.data?.detail || 'Scan rejected',
      });
      inputRef.current?.focus();
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="terminal-page">
      <header className="terminal-header">
        <Link to="/" className="terminal-back">
          <ArrowLeft size={18} />
          Back
        </Link>
        <div className="terminal-header-center">
          <h1>Pick terminal</h1>
          <p>{user?.fullName ?? user?.email}</p>
        </div>
        <button type="button" className="icon-btn" onClick={loadTask} aria-label="Refresh task">
          <RefreshCw size={18} className={loading ? 'spin' : ''} />
        </button>
        <button type="button" className="icon-btn terminal-logout" onClick={logout} aria-label="Log out">
          <LogOut size={18} />
        </button>
      </header>

      <main className="terminal-main">
        {loading && !task ? (
          <div className="terminal-state">
            <div className="app-loading-spinner" />
            <span>Loading task…</span>
          </div>
        ) : noTask ? (
          <div className="terminal-state">
            <Package size={48} strokeWidth={1.25} />
            <h2>No pick task</h2>
            <p>Wait for a wave assignment or ask your supervisor to start a shift.</p>
            <button type="button" className="btn btn-primary" onClick={loadTask}>
              Check again
            </button>
          </div>
        ) : task ? (
          <>
            <div className="terminal-task-card">
              <span className="terminal-task-type">{task.taskType.replace(/_/g, ' ')}</span>
              <div className="terminal-location">
                <MapPin size={20} />
                <span className="text-mono">{task.locationCode || '—'}</span>
              </div>
              <div className="terminal-sku">
                <span className="terminal-sku-label">SKU</span>
                <span className="text-mono">{task.productSku}</span>
              </div>
              <div className="terminal-qty-row">
                <span>Pick quantity</span>
                <span className="terminal-qty-value">{task.quantityRequired}</span>
              </div>
            </div>

            {message && (
              <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                {message.text}
              </div>
            )}

            <form className="terminal-scan-form" onSubmit={handleScan}>
              <label className="form-label" htmlFor="barcode">
                Scan barcode (SKU, product, or location)
              </label>
              <div className="terminal-scan-row">
                <input
                  ref={inputRef}
                  id="barcode"
                  className="input-field terminal-scan-input"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Scan or type…"
                  autoComplete="off"
                  disabled={scanning}
                />
              </div>

              <div className="terminal-qty-controls">
                <span className="form-label">Units per scan</span>
                <div className="qty-stepper">
                  <button
                    type="button"
                    className="qty-stepper-btn"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                  >
                    −
                  </button>
                  <span className="qty-stepper-value text-mono">{quantity}</span>
                  <button
                    type="button"
                    className="qty-stepper-btn"
                    onClick={() => setQuantity((q) => Math.min(task.quantityRequired, q + 1))}
                    disabled={quantity >= task.quantityRequired}
                  >
                    +
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary terminal-submit" disabled={scanning || !barcode.trim()}>
                <ScanLine size={20} />
                {scanning ? 'Processing…' : 'Confirm pick'}
              </button>
            </form>
          </>
        ) : null}
      </main>
    </div>
  );
}

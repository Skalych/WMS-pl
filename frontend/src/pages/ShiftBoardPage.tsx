import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Clock, LogOut } from 'lucide-react';
import ShiftPulseBoard from '../components/ShiftPulseBoard';
import { useShiftLive } from '../hooks/useShiftLive';
import { useAuth } from '../context/AuthContext';

export default function ShiftBoardPage() {
  const { data, connected } = useShiftLive();
  const { logout } = useAuth();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    document.documentElement.classList.add('shift-board-mode');
    return () => document.documentElement.classList.remove('shift-board-mode');
  }, []);

  return (
    <div className="shift-board-page">
      <header className="shift-board-topbar">
        <div>
          <h1>WMS Shift Board</h1>
          <p>Live warehouse operations — current shift</p>
        </div>
        <div className="shift-board-clock">
          <Clock size={18} />
          <span>{now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>
        <Link to="/" className="shift-board-exit">
          <X size={18} />
          Exit fullscreen
        </Link>
        <button type="button" className="shift-board-exit" onClick={logout}>
          <LogOut size={18} />
          Log out
        </button>
      </header>

      <ShiftPulseBoard data={data} connected={connected} fullscreen />
    </div>
  );
}

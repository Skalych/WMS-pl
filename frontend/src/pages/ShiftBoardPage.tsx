import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Clock } from 'lucide-react';
import ShiftPulseBoard from '../components/ShiftPulseBoard';
import { useShiftLive } from '../hooks/useShiftLive';

export default function ShiftBoardPage() {
  const { data, connected } = useShiftLive();
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
      </header>

      <ShiftPulseBoard data={data} connected={connected} fullscreen />
    </div>
  );
}

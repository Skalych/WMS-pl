import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, Clock, LogOut } from 'lucide-react';
import ShiftPulseBoard from '../components/ShiftPulseBoard';
import { useShiftLive } from '../hooks/useShiftLive';
import { useAuth } from '../context/AuthContext';

export default function ShiftBoardPage() {
  const { t } = useTranslation();
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
          <h1>{t('shiftBoard.title')}</h1>
          <p>{t('shiftBoard.subtitle')}</p>
        </div>
        <div className="shift-board-clock">
          <Clock size={18} />
          <span>{now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>
        <Link to="/" className="shift-board-exit">
          <X size={18} />
          {t('shiftBoard.exit')}
        </Link>
        <button type="button" className="shift-board-exit" onClick={logout}>
          <LogOut size={18} />
          {t('shiftBoard.logout')}
        </button>
      </header>

      <ShiftPulseBoard data={data} connected={connected} fullscreen />
    </div>
  );
}

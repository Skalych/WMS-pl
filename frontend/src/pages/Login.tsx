import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { authService } from '../api/services';
import { UserRole } from '../types';

const Login: React.FC = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const tokenData = await authService.login(email, password);
      localStorage.setItem('access_token', tokenData.access_token);

      const profile = await authService.getMe();
      login(tokenData.access_token, {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        role: profile.role as UserRole,
      });
      navigate('/');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: string | { msg?: string }[] } } };
      let errorMsg = t('login.invalidCredentials');
      if (!axiosErr.response) {
        errorMsg = t('login.serverUnreachable');
      } else if ((axiosErr.response.status ?? 0) >= 500) {
        errorMsg = t('login.serverError');
      }
      const detail = axiosErr.response?.data?.detail;
      if (typeof detail === 'string') {
        errorMsg = detail;
      } else if (Array.isArray(detail)) {
        errorMsg = detail.map((d) => d.msg || 'Invalid field').join(', ');
      }
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = (role: 'admin' | 'picker' | 'inbound') => {
    if (role === 'admin') {
      setEmail('admin@wms.local');
      setPassword('password123');
    } else if (role === 'inbound') {
      setEmail('oleg.d@wms.local');
      setPassword('password123');
    } else {
      setEmail('ivan.p@wms.local');
      setPassword('password123');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">W</div>
          <h1 className="login-title">{t('login.title')}</h1>
          <p className="login-subtitle">{t('login.subtitle')}</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <div>
            <label className="login-label" htmlFor="email">
              {t('login.email')}
            </label>
            <input
              id="email"
              type="email"
              className="input-field"
              style={{ width: '100%' }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@warehouse.local"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="login-label" htmlFor="password">
              {t('login.password')}
            </label>
            <input
              id="password"
              type="password"
              className="input-field"
              style={{ width: '100%' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isLoading}>
            {isLoading ? t('login.signingIn') : t('login.signIn')}
          </button>
        </form>

        <div className="login-demo">
          <button type="button" className="login-demo-btn" onClick={() => fillDemo('admin')}>
            {t('login.demoAdmin')}
          </button>
          <button type="button" className="login-demo-btn" onClick={() => fillDemo('picker')}>
            {t('login.demoPicker')}
          </button>
          <button type="button" className="login-demo-btn" onClick={() => fillDemo('inbound')}>
            {t('login.demoInbound')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;

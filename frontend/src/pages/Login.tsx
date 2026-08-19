import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../api/services';
import { UserRole } from '../types';

const Login: React.FC = () => {
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
      let errorMsg = 'Invalid email or password.';
      if (!axiosErr.response) {
        errorMsg = 'Cannot reach server. Is the backend running on port 8000?';
      } else if ((axiosErr.response.status ?? 0) >= 500) {
        errorMsg = 'Server error — check PostgreSQL and run seed if needed.';
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
          <h1 className="login-title">WMS Operations</h1>
          <p className="login-subtitle">Sign in to continue</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <div>
            <label className="login-label" htmlFor="email">
              Email
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
              Password
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
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="login-demo">
          <button type="button" className="login-demo-btn" onClick={() => fillDemo('admin')}>
            Admin demo
          </button>
          <button type="button" className="login-demo-btn" onClick={() => fillDemo('picker')}>
            Picker demo
          </button>
          <button type="button" className="login-demo-btn" onClick={() => fillDemo('inbound')}>
            Inbound demo
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;

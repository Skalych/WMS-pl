import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../api/services';
import { UserRole } from '../types';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const tokenData = await authService.login(email, password);
      localStorage.setItem('access_token', tokenData.access_token);

      const profile = await authService.getMe();
      const userData = {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        role: profile.role as UserRole,
      };

      login(tokenData.access_token, userData);
      navigate('/');
    } catch (err: any) {
      let errorMsg = 'Authentication failed. Check credentials.';
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        errorMsg = detail;
      } else if (Array.isArray(detail)) {
        errorMsg = detail.map((d: any) => d.msg || 'Invalid field').join(', ');
      }
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Демонстраційні логіни для зручності
  const fillDemo = (role: 'admin' | 'picker') => {
    if (role === 'admin') {
      setEmail('admin@wms.local');
      setPassword('password123');
    } else {
      setEmail('ivan.p@wms.local');
      setPassword('password123');
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 50%, #1a1a2e 0%, #08080f 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Декоративні неонові елементи на фоні */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-10%',
        width: '400px',
        height: '400px',
        background: 'rgba(227, 89, 172, 0.05)',
        filter: 'blur(80px)',
        borderRadius: '50%'
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '-10%',
        width: '500px',
        height: '500px',
        background: 'rgba(56, 189, 248, 0.03)',
        filter: 'blur(100px)',
        borderRadius: '50%'
      }}></div>

      <div style={{
        background: 'rgba(15, 15, 22, 0.7)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(227, 89, 172, 0.2)',
        borderRadius: '16px',
        padding: '40px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 0 40px rgba(227, 89, 172, 0.1)',
        zIndex: 1
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            background: 'linear-gradient(135deg, #e359ac 0%, #c026d3 100%)',
            borderRadius: '12px',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '24px',
            marginBottom: '16px',
            boxShadow: '0 0 20px rgba(227, 89, 172, 0.4)'
          }}>
            W
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'white' }}>WMS Nexus</h1>
          <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '4px' }}>System Authorization Required</p>
        </div>

        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b6b80', letterSpacing: '1px', marginBottom: '8px' }}>
              Terminal ID (Email)
            </label>
            <input 
              type="email" 
              className="input-field" 
              style={{ width: '100%', padding: '12px' }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="operator@nexus.local"
            />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b6b80', letterSpacing: '1px', marginBottom: '8px' }}>
              Access Code (Password)
            </label>
            <input 
              type="password" 
              className="input-field" 
              style={{ width: '100%', padding: '12px' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px', fontSize: '1rem', marginTop: '10px' }}
            disabled={isLoading}
          >
            {isLoading ? 'AUTHENTICATING...' : 'INITIALIZE CONNECTION'}
          </button>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button type="button" className="badge badge-accent" onClick={() => fillDemo('admin')} style={{ cursor: 'pointer', border: 'none' }}>
            [ DEMO ADMIN ]
          </button>
          <button type="button" className="badge badge-info" onClick={() => fillDemo('picker')} style={{ cursor: 'pointer', border: 'none' }}>
            [ DEMO PICKER ]
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;

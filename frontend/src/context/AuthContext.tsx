import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { UserRole } from '../types';
import { authService } from '../api/services';
import { setUnauthorizedHandler } from '../api/authSession';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapUser = (data: any): User => ({
  id: data.id,
  email: data.email,
  fullName: data.full_name ?? data.fullName,
  role: data.role as UserRole,
});

const readCachedUser = (): User | null => {
  try {
    const token = localStorage.getItem('access_token');
    const cached = localStorage.getItem('user_data');
    if (!token || !cached) return null;
    return JSON.parse(cached) as User;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(() => readCachedUser());
  const [isLoading, setIsLoading] = useState(() => !!localStorage.getItem('access_token'));

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_data');
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      const cached = readCachedUser();
      if (cached) {
        setUser(cached);
      }

      try {
        const profile = await authService.getMe();
        const mapped = mapUser(profile);
        localStorage.setItem('user_data', JSON.stringify(mapped));
        setUser(mapped);
      } catch (err) {
        // Only clear session when token is actually invalid/expired — not on network blips.
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user_data');
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user_data', JSON.stringify(userData));
    setUser(userData);
  };

  const hasToken = !!localStorage.getItem('access_token');
  const isAuthenticated = !!user || (isLoading && hasToken);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

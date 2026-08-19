import axios from 'axios';
import { triggerUnauthorized } from './authSession';

// Dev: Vite proxy /api → :8000. Prod: set VITE_API_URL.
const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url ?? '';
    const hadToken = !!localStorage.getItem('access_token');

    if (status === 401 && hadToken && !url.includes('/auth/login')) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_data');
      triggerUnauthorized();
    }

    return Promise.reject(error);
  },
);

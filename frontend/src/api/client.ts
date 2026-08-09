import axios from 'axios';

// За замовчуванням звертаємося до локального FastAPI (порт 8000)
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Автоматичне додавання токену авторизації до всіх запитів
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Глобальна обробка помилок (наприклад, викидання на сторінку логіну якщо токен застарів)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Якщо неавторизовані - видаляємо токен
      localStorage.removeItem('access_token');
      // В майбутньому тут можна додати window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

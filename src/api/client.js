import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Inject token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bylance_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('bylance_token');
      localStorage.removeItem('bylance_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

import axios from 'axios';
import { isDemoMode, getDemoResponse, DEMO_RESPONSES } from './demoData';

// Use environment variable or default to /api (Vite proxy handles this in dev)
const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors — serve demo data when backend is unreachable
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If backend is unreachable (network error, 500, 502, 503) and we're in demo mode
    const isServerDown = !error.response || error.response.status >= 500;
    
    if (isServerDown && isDemoMode()) {
      // Serve demo data from client
      const url = error.config?.url || '';
      const demoData = getDemoResponse(url);
      
      // Return a fake successful response
      return Promise.resolve({
        data: demoData,
        status: 200,
        statusText: 'OK (Demo Mode)',
        headers: {},
        config: error.config
      });
    }

    // Handle 401 — redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;

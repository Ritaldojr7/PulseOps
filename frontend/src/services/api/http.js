import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

const http = axios.create({
  baseURL,
  timeout: 15000,
});

http.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('pulseops.token') || localStorage.getItem('pulseops.token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      sessionStorage.removeItem('pulseops.token');
      sessionStorage.removeItem('pulseops.user');
      localStorage.removeItem('pulseops.token');
      localStorage.removeItem('pulseops.user');
      localStorage.removeItem('pulseops.remember');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(err);
  }
);

export default http;

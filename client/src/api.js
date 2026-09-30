import axios from 'axios';
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', timeout: 75000 });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('creatorforge.token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use((response) => response, (error) => {
  if (error.response?.status === 401 && !/\/auth\/(login|register|google(?:\/challenge)?)$/.test(error.config?.url || '')) window.dispatchEvent(new Event('creatorforge.session-expired'));
  return Promise.reject(error);
});
export const errorText = (error) => error.response?.data?.error || (error.code === 'ECONNABORTED' ? 'The request timed out. Please try again.' : 'Could not reach the server. Check your connection and try again.');

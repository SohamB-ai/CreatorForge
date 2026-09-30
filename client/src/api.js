import axios from 'axios';
import { readChatStream } from './chat-stream.js';
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

export async function streamChat(values, { signal, onDelta }) {
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) abort();
  const deadline = setTimeout(() => controller.abort(Object.assign(new Error('The request timed out.'), { code: 'ECONNABORTED' })), 75000);
  try {
    const token = localStorage.getItem('creatorforge.token');
    const response = await fetch(`${api.defaults.baseURL.replace(/\/$/, '')}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(values), signal: controller.signal,
    });
    if (!response.ok) {
      if (response.status === 401) window.dispatchEvent(new Event('creatorforge.session-expired'));
      const data = await response.json().catch(() => ({ error: 'The server could not start generation. Please try again.' }));
      throw Object.assign(new Error(data.error), { response: { data, status: response.status } });
    }
    if (!response.headers.get('content-type')?.includes('text/event-stream') || !response.body) throw Object.assign(new Error('Invalid stream'), { response: { data: { error: 'The server did not return a response stream. Please try again.' } } });
    return await readChatStream(response.body, { signal: controller.signal, onDelta });
  } catch (failure) {
    if (controller.signal.aborted) throw controller.signal.reason;
    throw failure;
  } finally {
    clearTimeout(deadline);
    signal.removeEventListener('abort', abort);
  }
}

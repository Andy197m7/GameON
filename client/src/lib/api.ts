import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  withCredentials: true,
});

// Attach Clerk token to every request
api.interceptors.request.use(async (config) => {
  try {
    // @ts-ignore — window.__clerk set by ClerkProvider
    const token = await window.__clerk?.session?.getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch (_) {}
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.error || err.message || 'Something went wrong';
    return Promise.reject(new Error(msg));
  }
);

export default api;

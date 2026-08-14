import axios from 'axios';

type TokenGetter = () => Promise<string | null>;
let tokenGetter: TokenGetter | null = null;

/** Called once by AuthProvider with Clerk's getToken(), so every request
 *  below can attach a fresh, real Clerk session token. Replaces the old
 *  window.__clerk global hack. */
export function setTokenGetter(fn: TokenGetter) {
  tokenGetter = fn;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  withCredentials: true,
});

// Attach a fresh Clerk token to every request
api.interceptors.request.use(async (config) => {
  try {
    const token = tokenGetter ? await tokenGetter() : null;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch (_) {
    // no-op — request goes out unauthenticated and the server will 401 it
  }
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

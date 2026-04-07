import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];

// Auto-refresh expired tokens
api.interceptors.response.use(
  (response) => {
    const data = response.data;
    if (data && typeof data === 'object' && 'data' in data) {
      return data.data;
    }
    return data;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until token is refreshed
        return new Promise((resolve) => {
          pendingRequests.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (!refreshToken) throw new Error('No refresh token');

        const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = response.data.data;

        useAuthStore.getState().setTokens(accessToken, newRefresh);

        // Retry pending requests
        pendingRequests.forEach((cb) => cb(accessToken));
        pendingRequests = [];

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        pendingRequests = [];
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Extract error message from API response
    const message =
      error.response?.data?.message ||
      error.message ||
      'Something went wrong';

    return Promise.reject(new Error(message));
  },
);

// Typed API helpers
export const apiGet = <T>(url: string, params?: object): Promise<T> =>
  api.get(url, { params }) as unknown as Promise<T>;

export const apiPost = <T>(url: string, data?: object): Promise<T> =>
  api.post(url, data) as unknown as Promise<T>;

export const apiPut = <T>(url: string, data?: object): Promise<T> =>
  api.put(url, data) as unknown as Promise<T>;

export const apiPatch = <T>(url: string, data?: object): Promise<T> =>
  api.patch(url, data) as unknown as Promise<T>;

export const apiDelete = <T>(url: string): Promise<T> =>
  api.delete(url) as unknown as Promise<T>;

// Check if server is reachable
export const checkConnectivity = async (): Promise<boolean> => {
  try {
    await axios.get(`${API_URL.replace('/api/v1', '')}/health`, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
};

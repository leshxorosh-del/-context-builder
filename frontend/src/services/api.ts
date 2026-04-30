import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * API error response
 */
export interface ApiError {
  error: string;
  message: string;
  code?: string;
  statusCode: number;
}

/**
 * Create axios instance with interceptors
 */
const api: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token storage keys
const ACCESS_TOKEN_KEY = 'cb_access_token';
const REFRESH_TOKEN_KEY = 'cb_refresh_token';

/**
 * Get stored access token
 */
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Get stored refresh token
 */
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Store tokens
 */
export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

/**
 * Clear tokens
 */
export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// Request interceptor - add auth header
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors and token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null): void => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config;

    // Handle 401 - try to refresh token
    if (error.response?.status === 401 && originalRequest) {
      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        const response = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        setTokens(accessToken, newRefreshToken);

        processQueue(null, accessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle other errors
    const apiError = error.response?.data;
    const message = apiError?.message || 'Произошла ошибка. Попробуйте ещё раз.';

    // Don't show toast for auth errors (handled separately)
    if (error.response?.status !== 401) {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export default api;

// ==========================================
// API Endpoints
// ==========================================

// Auth
export const authApi = {
  register: (data: { email: string; password: string; nickname?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

// Chats
export const chatsApi = {
  list: () => api.get('/chats'),
  create: (data: { title?: string }) => api.post('/chats', data),
  get: (id: string) => api.get(`/chats/${id}`),
  update: (id: string, data: { title?: string; position_x?: number; position_y?: number }) =>
    api.patch(`/chats/${id}`, data),
  delete: (id: string) => api.delete(`/chats/${id}`),
  addMessage: (id: string, data: { content: string; role?: string }) =>
    api.post(`/chats/${id}/messages`, data),
  toggleSelection: (chatId: string, msgId: string) =>
    api.patch(`/chats/${chatId}/messages/${msgId}/select`),
  setSelection: (chatId: string, msgId: string, isSelected: boolean) =>
    api.put(`/chats/${chatId}/messages/${msgId}/select`, { isSelected }),
  getSelected: (id: string) => api.get(`/chats/${id}/selected`),
  selectAll: (id: string) => api.post(`/chats/${id}/select-all`),
  deselectAll: (id: string) => api.post(`/chats/${id}/deselect-all`),
  search: (id: string, q: string) => api.get(`/chats/${id}/search`, { params: { q } }),
};

// Super-chats (Context)
export const superChatsApi = {
  getProjectMap: () => api.get('/super-chats/project-map'),
  create: (data: { title: string; position_x?: number; position_y?: number; color?: string }) =>
    api.post('/super-chats', data),
  get: (id: string) => api.get(`/super-chats/${id}`),
  update: (id: string, data: Partial<{ title: string; position_x: number; position_y: number; color: string }>) =>
    api.patch(`/super-chats/${id}`, data),
  delete: (id: string) => api.delete(`/super-chats/${id}`),
  getGraph: (id: string) => api.get(`/super-chats/${id}/graph`),
  addLink: (id: string, data: { sourceChatId: string; linkType?: string }) =>
    api.post(`/super-chats/${id}/link`, data),
  removeLink: (superChatId: string, linkId: string) =>
    api.delete(`/super-chats/${superChatId}/links/${linkId}`),
  updateLinkMessages: (linkId: string, messageIds: string[]) =>
    api.patch(`/super-chats/links/${linkId}/messages`, { messageIds }),
  query: (id: string, message: string) =>
    api.post(`/super-chats/${id}/query`, { message }),
};

// Tariffs
export const tariffsApi = {
  getPlans: () => api.get('/tariffs/plans'),
  getStatus: () => api.get('/tariffs/status'),
  upgrade: (plan: 'monthly' | 'yearly') => api.post('/tariffs/upgrade', { plan }),
};

// Digests
export const digestsApi = {
  getLatest: (superChatId: string) => api.get(`/digests/${superChatId}/latest`),
  getHistory: (superChatId: string) => api.get(`/digests/${superChatId}/history`),
  generate: (superChatId: string) => api.post(`/digests/${superChatId}/send`),
};

// Notifications
export const notificationsApi = {
  getConfig: () => api.get('/notifications/config'),
  updateConfig: (data: {
    telegramChatId?: string;
    email?: string;
    slackWebhook?: string;
    schedule?: object;
    triggers?: object;
  }) => api.put('/notifications/config', data),
  test: (channel: 'telegram' | 'email' | 'slack') =>
    api.post('/notifications/test', { channel }),
};

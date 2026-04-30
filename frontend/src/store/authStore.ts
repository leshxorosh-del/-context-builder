import { create } from 'zustand';
import { authApi, setTokens, clearTokens, getAccessToken } from '@services/api';
import { initializeSocket, disconnectSocket } from '@services/socket';

/**
 * User interface
 */
export interface User {
  id: string;
  email: string;
  nickname: string | null;
  avatar_url: string | null;
  created_at: string;
}

/**
 * Auth store state
 */
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Auth store actions
 */
interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, nickname?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
  clearError: () => void;
}

/**
 * Auth store
 */
export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  // State
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  // Actions
  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login({ email, password });
      const { user, accessToken, refreshToken } = response.data;
      
      setTokens(accessToken, refreshToken);
      initializeSocket();
      
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Ошибка входа';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  register: async (email: string, password: string, nickname?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.register({ email, password, nickname });
      const { user, accessToken, refreshToken } = response.data;
      
      setTokens(accessToken, refreshToken);
      initializeSocket();
      
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Ошибка регистрации';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors
    } finally {
      clearTokens();
      disconnectSocket();
      set({ user: null, isAuthenticated: false, error: null });
    }
  },

  checkAuth: async () => {
    const token = getAccessToken();
    
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const response = await authApi.me();
      const { user } = response.data;
      
      initializeSocket();
      
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  setUser: (user: User | null) => {
    set({ user, isAuthenticated: !!user });
  },

  clearError: () => {
    set({ error: null });
  },
}));

export default useAuthStore;

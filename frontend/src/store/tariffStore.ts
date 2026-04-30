import { create } from 'zustand';
import { tariffsApi } from '@services/api';

/**
 * Plan interface
 */
export interface Plan {
  id: 'free' | 'monthly' | 'yearly';
  name: string;
  price: number;
  initialQueries: number;
  dailyBonus: number;
  maxAccumulation: number;
  features: string[];
}

/**
 * Tariff status
 */
export interface TariffStatus {
  plan: 'free' | 'monthly' | 'yearly';
  planName: string;
  queriesRemaining: number;
  dailyBonus: number;
  maxAccumulation: number;
  nextBonusAt: string | null;
  expiresAt: string | null;
  features: string[];
}

/**
 * Tariff store state
 */
interface TariffState {
  status: TariffStatus | null;
  plans: Plan[];
  isLoading: boolean;
}

/**
 * Tariff store actions
 */
interface TariffActions {
  loadStatus: () => Promise<void>;
  loadPlans: () => Promise<void>;
  upgradePlan: (plan: 'monthly' | 'yearly') => Promise<void>;
  decrementQuota: () => void;
}

/**
 * Tariff store
 */
export const useTariffStore = create<TariffState & TariffActions>((set, get) => ({
  // State
  status: null,
  plans: [],
  isLoading: false,

  // Actions
  loadStatus: async () => {
    try {
      const response = await tariffsApi.getStatus();
      set({ status: response.data });
    } catch (error) {
      console.error('Failed to load tariff status:', error);
    }
  },

  loadPlans: async () => {
    try {
      const response = await tariffsApi.getPlans();
      set({ plans: response.data.plans });
    } catch (error) {
      console.error('Failed to load plans:', error);
    }
  },

  upgradePlan: async (plan) => {
    set({ isLoading: true });
    try {
      const response = await tariffsApi.upgrade(plan);
      set({ status: response.data.status, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  decrementQuota: () => {
    const status = get().status;
    if (status && status.queriesRemaining > 0) {
      set({
        status: {
          ...status,
          queriesRemaining: status.queriesRemaining - 1,
        },
      });
    }
  },
}));

export default useTariffStore;

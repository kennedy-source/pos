import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'STOREKEEPER' | 'EMBROIDERY_OPERATOR';
  isActive: boolean;
  avatarUrl?: string;
  lastLoginAt?: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
    }),
    {
      name: 'uniform-pos-auth',
      // Only persist tokens — user object is re-fetched on load
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

// Role-based permission helpers
export const ROLE_PERMISSIONS = {
  ADMIN: ['all'],
  MANAGER: ['pos', 'inventory', 'embroidery', 'customers', 'reports', 'users_view'],
  CASHIER: ['pos', 'customers', 'embroidery_create'],
  STOREKEEPER: ['inventory', 'products_view'],
  EMBROIDERY_OPERATOR: ['embroidery_status', 'embroidery_view'],
} as const;

export const hasPermission = (
  role: AuthUser['role'] | undefined,
  permission: string,
): boolean => {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role] as readonly string[];
  return perms.includes('all') || perms.includes(permission);
};

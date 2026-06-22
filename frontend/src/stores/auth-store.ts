import { create } from 'zustand';

export interface UserPermission {
  module: string;
  actions: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'employee';
  permissions: UserPermission[];
  isActive: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string) => void;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  setAuth: (user, accessToken) => {
    set({ user, accessToken, isAuthenticated: true });
  },
  setAccessToken: (token) => {
    set({ accessToken: token });
  },
  clearAuth: () => {
    set({ user: null, accessToken: null, isAuthenticated: false });
  },
}));

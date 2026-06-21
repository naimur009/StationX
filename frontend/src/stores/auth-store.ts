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
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string) => void;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
}

function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('accessToken');
  } catch {
    return null;
  }
}

function persistAccessToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token === null) {
      localStorage.removeItem('accessToken');
    } else {
      localStorage.setItem('accessToken', token);
    }
  } catch {
    // ignore storage errors
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: getStoredAccessToken(),
  isAuthenticated: false,
  setAuth: (user, accessToken) => {
    persistAccessToken(accessToken);
    set({ user, accessToken, isAuthenticated: true });
  },
  setAccessToken: (token) => {
    persistAccessToken(token);
    set({ accessToken: token });
  },
  clearAuth: () => {
    persistAccessToken(null);
    set({ user: null, accessToken: null, isAuthenticated: false });
  },
}));

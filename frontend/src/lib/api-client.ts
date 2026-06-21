import { AppError } from './utils';
import { useAuthStore } from '@/stores/auth-store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface RequestConfig extends RequestInit {
  skipAuth?: boolean;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const newToken: string = data.data?.accessToken;

    if (newToken) {
      useAuthStore.getState().setAccessToken(newToken);
    }

    return newToken;
  } catch {
    return null;
  }
}

export async function apiClient<T>(
  path: string,
  config: RequestConfig = {}
): Promise<T> {
  const { skipAuth = false, ...fetchConfig } = config;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchConfig.headers as Record<string, string>),
  };

  if (!skipAuth) {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...fetchConfig,
      headers,
      credentials: 'include',
    });
  } catch {
    throw new AppError(
      'NETWORK_ERROR',
      'Unable to reach the server. Please check your connection.'
    );
  }

  if (response.status === 401 && !skipAuth) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken();
    }

    const newToken = await refreshPromise;
    refreshPromise = null;

    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;

      const retryResponse = await fetch(`${API_BASE}${path}`, {
        ...fetchConfig,
        headers,
        credentials: 'include',
      });

      if (retryResponse.ok) {
        return retryResponse.json();
      }
    }

    useAuthStore.getState().clearAuth();

    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }

    throw new AppError('UNAUTHORIZED', 'Session expired. Please log in again.');
  }

  if (!response.ok) {
    let errorBody: { error?: { code?: string; message?: string } } = {};
    try {
      errorBody = await response.json();
    } catch {
      // ignore parse errors
    }

    throw new AppError(
      errorBody.error?.code || 'NETWORK_ERROR',
      errorBody.error?.message || 'An unexpected error occurred'
    );
  }

  return response.json() as Promise<T>;
}

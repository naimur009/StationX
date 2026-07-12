'use client';

import { AppError } from './utils';
import { useAuthStore } from '@/stores/auth-store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface RequestConfig extends RequestInit {
  skipAuth?: boolean;
}

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

function buildHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function apiClient<T>(
  path: string,
  config: RequestConfig = {}
): Promise<T> {
  const { skipAuth = false, ...fetchConfig } = config;
  const store = useAuthStore.getState();

  let token = store.accessToken;

  const isAuthPage = typeof window !== 'undefined' && ['/login'].includes(window.location.pathname);

  if (!token && !skipAuth && (store.isAuthenticated || path === '/auth/me')) {
    token = await refreshAccessToken();
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...fetchConfig,
    headers: buildHeaders(token),
    credentials: 'include',
  }).catch(() => {
    throw new AppError(
      'NETWORK_ERROR',
      'Unable to reach the server. Please check your connection.'
    );
  });

  if (response.status === 401 && !skipAuth && store.isAuthenticated) {
    const newToken = await refreshAccessToken();

    if (newToken) {
      const retryResponse = await fetch(`${API_BASE}${path}`, {
        ...fetchConfig,
        headers: buildHeaders(newToken),
        credentials: 'include',
      });

      if (retryResponse.ok) {
        return retryResponse.json();
      }
    }

    useAuthStore.getState().clearAuth();

    const authPaths = ['/login'];
    if (typeof window !== 'undefined' && !authPaths.includes(window.location.pathname)) {
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

export async function uploadFile(
  path: string,
  file: File,
  folder?: string
): Promise<{ data: { url: string; publicId: string } }> {
  const store = useAuthStore.getState();
  let token = store.accessToken;

  if (!token && !store.isAuthenticated) {
    throw new AppError('UNAUTHORIZED', 'You must be logged in to upload files.');
  }

  if (!token && store.isAuthenticated) {
    token = await refreshAccessToken();
  }

  const formData = new FormData();
  formData.append('file', file);
  if (folder) {
    formData.append('folder', folder);
  }

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'include',
  }).catch(() => {
    throw new AppError('NETWORK_ERROR', 'Unable to reach the server. Please check your connection.');
  });

  if (response.status === 401 && store.isAuthenticated) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const retryFormData = new FormData();
      retryFormData.append('file', file);
      if (folder) {
        retryFormData.append('folder', folder);
      }

      const retryResponse = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${newToken}` },
        body: retryFormData,
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
      errorBody.error?.code || 'UPLOAD_FAILED',
      errorBody.error?.message || 'Upload failed. Please try again.'
    );
  }

  return response.json();
}

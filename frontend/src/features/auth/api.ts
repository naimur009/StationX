'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'employee';
  permissions: { module: string; actions: string[] }[];
}

export type MeResponse = { data: UserResponse } | { data: null };

interface LoginPayload {
  accessToken: string;
  user: UserResponse;
}

export function useLogin() {
  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      apiClient<{ data: LoginPayload }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
        skipAuth: true,
      }),
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: () =>
      apiClient<{ data: { success: boolean } }>('/auth/logout', {
        method: 'POST',
      }),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (data: { email: string }) =>
      apiClient<{ data: { success: boolean } }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (data: { token: string; newPassword: string }) =>
      apiClient<{ data: { success: boolean } }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}

export function useMe() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiClient<MeResponse>('/auth/me'),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

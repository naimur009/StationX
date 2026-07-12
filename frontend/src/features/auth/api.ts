'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'employee' | 'chief';
  permissions: { module: string; actions: string[] }[];
  isActive: boolean;
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

export function useMe() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiClient<MeResponse>('/auth/me'),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'employee' | 'chief';
  permissions: { module: string; actions: string[] }[];
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UsersListResponse {
  data: UserResponse[];
  meta: { total: number; page: number; limit: number };
}

interface UsersListParams {
  page?: number;
  limit?: number;
  role?: string;
  includeInactive?: string;
  search?: string;
}

export function useUsersList(params: UsersListParams) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.role) searchParams.set('role', params.role);
  if (params.includeInactive) searchParams.set('includeInactive', params.includeInactive);
  if (params.search) searchParams.set('search', params.search);

  const qs = searchParams.toString();

  return useQuery({
    queryKey: ['users', 'list', qs],
    queryFn: () => apiClient<UsersListResponse>(`/users${qs ? `?${qs}` : ''}`),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', 'detail', id],
    queryFn: () => apiClient<{ data: UserResponse }>(`/users/${id}`),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      email: string;
      password: string;
      role: string;
      permissions: { module: string; actions: string[] }[];
    }) =>
      apiClient<{ data: UserResponse }>('/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'detail'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      id: string;
      name?: string;
      email: string;
      role?: string;
    }) =>
      apiClient<{ data: UserResponse }>(`/users/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...(data.name !== undefined ? { name: data.name } : {}),
          email: data.email,
          ...(data.role ? { role: data.role } : {}),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'detail'] });
    },
  });
}

export function useUpdatePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      id: string;
      permissions: { module: string; actions: string[] }[];
    }) =>
      apiClient<{ data: UserResponse }>(`/users/${data.id}/permissions`, {
        method: 'PATCH',
        body: JSON.stringify({ permissions: data.permissions }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'detail'] });
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ data: UserResponse }>(`/users/${id}/deactivate`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'detail'] });
    },
  });
}

export function useReactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ data: UserResponse }>(`/users/${id}/activate`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'detail'] });
    },
  });
}

export function usePermanentDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ data: { success: boolean } }>(`/users/${id}/permanent`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'detail'] });
    },
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; prevPassword: string; newPassword: string }) =>
      apiClient<{ data: { success: boolean } }>(`/users/${data.id}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ prevPassword: data.prevPassword, newPassword: data.newPassword }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'detail'] });
    },
  });
}

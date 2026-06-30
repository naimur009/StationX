'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface CustomerResponse {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  orderCount: number;
  createdAt: string;
  updatedAt: string;
}

interface CustomersListResponse {
  data: CustomerResponse[];
  meta: { total: number; page: number; limit: number };
}

interface CustomersListParams {
  page?: number;
  limit?: number;
  isActive?: string;
  search?: string;
}

export function useCustomersList(params: CustomersListParams) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.isActive) searchParams.set('isActive', params.isActive);
  if (params.search) searchParams.set('search', params.search);

  const qs = searchParams.toString();

  return useQuery({
    queryKey: ['customers', 'list', qs],
    queryFn: () => apiClient<CustomersListResponse>(`/customers${qs ? `?${qs}` : ''}`),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customers', 'detail', id],
    queryFn: () => apiClient<{ data: CustomerResponse }>(`/customers/${id}`),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; phone: string; email?: string; address?: string }) =>
      apiClient<{ data: CustomerResponse }>('/customers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useSaveOrFindCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { phone: string; name?: string; email?: string; address?: string }) =>
      apiClient<{ data: CustomerResponse }>('/customers/save-or-find', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; name?: string; phone?: string; email?: string; address?: string; isActive?: boolean }) => {
      const { id, ...body } = data;
      return apiClient<{ data: CustomerResponse }>(`/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ data: { success: boolean } }>(`/customers/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

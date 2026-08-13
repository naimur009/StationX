'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

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
  search?: string;
}

export function useCustomersList(params: CustomersListParams) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.search) searchParams.set('search', params.search);

  const qs = searchParams.toString();

  return useQuery({
    queryKey: ['customers', 'list', qs],
    queryFn: () => apiClient<CustomersListResponse>(`/customers${qs ? `?${qs}` : ''}`),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customers', 'detail', id],
    queryFn: () => apiClient<{ data: CustomerResponse }>(`/customers/${id}`),
    enabled: !!id,
    staleTime: 60_000,
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
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create customer');
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; name?: string; phone?: string; email?: string; address?: string }) => {
      const { id, ...body } = data;
      return apiClient<{ data: CustomerResponse }>(`/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update customer');
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
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete customer');
    },
  });
}

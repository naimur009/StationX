'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
export interface VendorResponse {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  itemsSupplied: string[];
  createdAt: string;
  updatedAt: string;
}

interface VendorsListResponse {
  data: VendorResponse[];
  meta: { total: number; page: number; limit: number };
}

interface VendorsListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export function useVendorsList(params: VendorsListParams) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.search) searchParams.set('search', params.search);

  const qs = searchParams.toString();

  return useQuery({
    queryKey: ['vendors', 'list', qs],
    queryFn: () => apiClient<VendorsListResponse>(`/vendors${qs ? `?${qs}` : ''}`),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useVendor(id: string) {
  return useQuery({
    queryKey: ['vendors', 'detail', id],
    queryFn: () => apiClient<{ data: VendorResponse }>(`/vendors/${id}`),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      contactPerson?: string;
      phone?: string;
      email?: string;
      address?: string;
      itemsSupplied?: string[];
    }) =>
      apiClient<{ data: VendorResponse }>('/vendors', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create vendor');
    },
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      id: string;
      name?: string;
      contactPerson?: string;
      phone?: string;
      email?: string;
      address?: string;
      itemsSupplied?: string[];
    }) => {
      const { id, ...body } = data;
      return apiClient<{ data: VendorResponse }>(`/vendors/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update vendor');
    },
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ data: { success: boolean } }>(`/vendors/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete vendor');
    },
  });
}

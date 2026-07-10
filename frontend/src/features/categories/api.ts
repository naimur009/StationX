'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface CategoryResponse {
  id: string;
  name: string;
  vatRate: number;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

interface CategoriesListResponse {
  data: CategoryResponse[];
  meta: { total: number; page: number; limit: number };
}

interface CategoriesListParams {
  page?: number;
  limit?: number;
  isActive?: string;
  search?: string;
}

export function useCategoriesList(params: CategoriesListParams) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.isActive) searchParams.set('isActive', params.isActive);
  if (params.search) searchParams.set('search', params.search);

  const qs = searchParams.toString();

  return useQuery({
    queryKey: ['categories', 'list', qs],
    queryFn: () => apiClient<CategoriesListResponse>(`/categories${qs ? `?${qs}` : ''}`),
  });
}

export function useCategory(id: string) {
  return useQuery({
    queryKey: ['categories', 'detail', id],
    queryFn: () => apiClient<{ data: CategoryResponse }>(`/categories/${id}`),
    enabled: !!id,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; vatRate?: number }) =>
      apiClient<{ data: CategoryResponse }>('/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; name?: string; isActive?: boolean; vatRate?: number }) => {
      const { id, ...body } = data;
      return apiClient<{ data: CategoryResponse }>(`/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ data: { success: boolean } }>(`/categories/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function usePermanentDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ data: { success: boolean } }>(`/categories/${id}/permanent`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

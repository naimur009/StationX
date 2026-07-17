'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface ProductResponse {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  categoryName: string | null;
  image: { url: string; publicId: string } | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProductsListResponse {
  data: ProductResponse[];
  meta: { total: number; page: number; limit: number };
}

interface ProductsListParams {
  page?: number;
  limit?: number;
  categoryId?: string;
  isActive?: string;
  search?: string;
}

export function useProductList(params: ProductsListParams) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.categoryId) searchParams.set('categoryId', params.categoryId);
  if (params.isActive) searchParams.set('isActive', params.isActive);
  if (params.search) searchParams.set('search', params.search);

  const qs = searchParams.toString();

  return useQuery({
    queryKey: ['products', 'list', qs],
    queryFn: () => apiClient<ProductsListResponse>(`/products${qs ? `?${qs}` : ''}`),
    staleTime: 30_000,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['products', 'detail', id],
    queryFn: () => apiClient<{ data: ProductResponse }>(`/products/${id}`),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      price: number;
      categoryId: string;
      image?: { url: string; publicId: string };
      description?: string;
    }) =>
      apiClient<{ data: ProductResponse }>('/products', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      id: string;
      name?: string;
      price?: number;
      categoryId?: string;
      image?: { url: string; publicId: string } | null;
      description?: string;
      isActive?: boolean;
    }) => {
      const { id, ...body } = data;
      return apiClient<{ data: ProductResponse }>(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ data: { success: boolean } }>(`/products/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

interface ReferenceDataResponse {
  categories: { id: string; name: string }[];
}

export function useProductReferenceData() {
  return useQuery({
    queryKey: ['products', 'reference-data'],
    queryFn: () => apiClient<ReferenceDataResponse>('/products/reference-data'),
    staleTime: 60_000,
  });
}

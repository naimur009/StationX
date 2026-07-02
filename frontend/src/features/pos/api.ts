'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface EmployeeInfo {
  id: string;
  name: string;
  role: string;
}

export interface CatalogProduct {
  id: string;
  name: string;
  price: number;
  image: { url: string; publicId: string } | null;
  category: string | null;
  categoryId: string | null;
  taxRate: number;
}

export interface CouponCheckResult {
  type: 'flat' | 'percentage';
  value: number;
  couponId: string;
}

export interface CustomerResult {
  id: string;
  name: string;
  phone: string;
  created: boolean;
}

export function useEmployees() {
  return useQuery({
    queryKey: ['pos', 'employees'],
    queryFn: () => apiClient<{ data: EmployeeInfo[] }>('/pos/employees'),
    staleTime: 60_000,
  });
}

export function useCatalog() {
  return useQuery({
    queryKey: ['pos', 'catalog'],
    queryFn: () => apiClient<{ data: CatalogProduct[] }>('/pos/catalog'),
    staleTime: 30_000,
  });
}

export function useCheckCoupon() {
  return useMutation({
    mutationFn: (code: string) =>
      apiClient<{ data: CouponCheckResult }>(`/pos/coupon?code=${encodeURIComponent(code)}`),
  });
}

export function useSaveOrFindCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; phone: string; email?: string; address?: string }) =>
      apiClient<{ data: CustomerResult }>('/pos/customers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient<{ data: { orderNumber: string } }>('/pos/orders', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

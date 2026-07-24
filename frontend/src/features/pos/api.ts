'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

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
  vatRate: number;
}

export interface CouponCheckResult {
  valid: boolean;
  couponId?: string;
  discountType?: 'flat' | 'percentage';
  value?: number;
  discountAmount?: number;
  reason?: 'NOT_FOUND' | 'DISABLED' | 'NOT_YET_VALID' | 'EXPIRED' | 'BELOW_MIN_ORDER' | 'USAGE_LIMIT_REACHED';
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
    mutationFn: (data: { code: string; subtotal: number; customerId?: string }) =>
      apiClient<{ data: CouponCheckResult }>('/pos/coupons/validate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to validate coupon');
    },
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
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to save or find customer');
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
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create order');
    },
  });
}

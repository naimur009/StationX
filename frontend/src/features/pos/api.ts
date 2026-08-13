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
  maxDiscountAmount?: number | null;
  reason?: 'NOT_FOUND' | 'DISABLED' | 'NOT_YET_VALID' | 'EXPIRED' | 'BELOW_MIN_ORDER' | 'USAGE_LIMIT_REACHED';
}

export function useLookupCustomer(phone: string) {
  return useQuery({
    queryKey: ['pos', 'customer-lookup', phone],
    queryFn: () => apiClient<{
      data: Array<{ id: string; name: string; phone: string; orderCount: number }>;
      meta: { total: number; page: number; limit: number };
    }>(`/customers?search=${encodeURIComponent(phone)}&limit=10`),
    enabled: phone.length > 0,
    staleTime: 60_000,
  });
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
    queryFn: () => apiClient<{ data: CatalogProduct[] }>('/pos/products'),
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

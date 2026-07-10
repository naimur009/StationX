'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface CouponResponse {
  id: string;
  code: string;
  discountType: 'flat' | 'percentage';
  value: number;
  validFrom: string;
  validUntil: string;
  isEnabled: boolean;
  usageLimit: number | null;
  usageCount: number;
  status: 'active' | 'scheduled' | 'expired' | 'disabled';
  createdAt: string;
  updatedAt: string;
}

interface CouponsListResponse {
  data: CouponResponse[];
  meta: { total: number; page: number; limit: number };
}

interface CouponsListParams {
  page?: number;
  limit?: number;
  isEnabled?: string;
  search?: string;
  discountType?: string;
}

export const COUPON_STATUS_CONFIG: Record<string, { variant: 'green' | 'blue' | 'red' | 'slate'; label: string }> = {
  active: { variant: 'green', label: 'Active' },
  scheduled: { variant: 'blue', label: 'Scheduled' },
  expired: { variant: 'red', label: 'Expired' },
  disabled: { variant: 'slate', label: 'Disabled' },
};

export function useCouponList(params: CouponsListParams) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.isEnabled) searchParams.set('isEnabled', params.isEnabled);
  if (params.search) searchParams.set('search', params.search);
  if (params.discountType) searchParams.set('discountType', params.discountType);

  const qs = searchParams.toString();

  return useQuery({
    queryKey: ['coupons', 'list', qs],
    queryFn: () => apiClient<CouponsListResponse>(`/coupons${qs ? `?${qs}` : ''}`),
    staleTime: 30_000,
  });
}

export function useCoupon(id: string) {
  return useQuery({
    queryKey: ['coupons', 'detail', id],
    queryFn: () => apiClient<{ data: CouponResponse }>(`/coupons/${id}`),
    enabled: !!id,
  });
}

export function useCreateCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      code: string;
      discountType: 'flat' | 'percentage';
      value: number;
      validFrom: string;
      validUntil: string;
      usageLimit?: number;
    }) =>
      apiClient<{ data: CouponResponse }>('/coupons', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
  });
}

export function useUpdateCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      id: string;
      code?: string;
      discountType?: 'flat' | 'percentage';
      value?: number;
      validFrom?: string;
      validUntil?: string;
      isEnabled?: boolean;
      usageLimit?: number | null;
    }) => {
      const { id, ...body } = data;
      return apiClient<{ data: CouponResponse }>(`/coupons/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
  });
}

export function useToggleCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ data: CouponResponse }>(`/coupons/${id}/toggle`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ data: { success: boolean } }>(`/coupons/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
  });
}



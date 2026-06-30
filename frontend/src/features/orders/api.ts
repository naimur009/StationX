'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface OrderListItem {
  id: string;
  orderNumber: string;
  tableNumber?: string;
  customerId: string | null;
  customerName?: string;
  customerPhone?: string;
  servedBy?: string | null;
  grandTotal: number;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
  createdBy: string;
}

export interface OrderItemDetail {
  productId: string;
  nameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderDetail {
  id: string;
  orderNumber: string;
  tableNumber?: string;
  customerId: { _id: string; name: string; phone: string } | string | null;
  customerName?: string;
  customerPhone?: string;
  servedBy?: { _id: string; name: string } | string | null;
  items: OrderItemDetail[];
  couponId?: string | null;
  discountPercent: number;
  discountAmount: number;
  taxAmount: number;
  subtotal: number;
  grandTotal: number;
  cashTendered?: number;
  changeAmount?: number;
  payment: {
    method: string;
  };
  status: 'pending' | 'completed' | 'cancelled';
  createdBy: { _id: string; name: string } | string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItemUpdate {
  productId: string;
  quantity: number;
}

interface OrdersListResponse {
  data: OrderListItem[];
  meta: { total: number; page: number; limit: number };
}

interface OrdersListParams {
  status?: string;
  from?: string;
  to?: string;
  createdBy?: string;
  customerId?: string;
  customerPhone?: string;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export function useOrderList(params: OrdersListParams) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set('status', params.status);
  if (params.from) searchParams.set('from', params.from);
  if (params.to) searchParams.set('to', params.to);
  if (params.createdBy) searchParams.set('createdBy', params.createdBy);
  if (params.customerId) searchParams.set('customerId', params.customerId);
  if (params.customerPhone) searchParams.set('customerPhone', params.customerPhone);
  if (params.search) searchParams.set('search', params.search);
  if (params.sort) searchParams.set('sort', params.sort);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));

  const qs = searchParams.toString();

  return useQuery({
    queryKey: ['orders', 'list', qs],
    queryFn: () => apiClient<OrdersListResponse>(`/orders${qs ? `?${qs}` : ''}`),
    refetchInterval: 30_000,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['orders', 'detail', id],
    queryFn: () => apiClient<{ data: OrderDetail }>(`/orders/${id}`),
    enabled: !!id,
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; tableNumber?: string; customerId?: string | null; items?: OrderItemUpdate[]; payment?: { method?: string }; discountPercent?: number }) => {
      const { id, ...body } = data;
      return apiClient<{ data: OrderDetail }>(`/orders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ data: { success: boolean } }>(`/orders/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; status: string; cancelReason?: string }) => {
      const { id, ...body } = data;
      return apiClient<{ data: OrderDetail }>(`/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useOrderBill(id: string, format: 'html' | 'pdf' = 'html') {
  return useQuery({
    queryKey: ['orders', 'bill', id, format],
    queryFn: async () => {
      if (format === 'pdf') {
        const store = await import('@/stores/auth-store').then((m) => m.useAuthStore.getState());
        const token = store.accessToken;
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
        const response = await fetch(`${API_BASE}/orders/${id}/bill?format=pdf`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to fetch PDF bill');
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      }
      const res = await apiClient<{ data: { html: string } }>(`/orders/${id}/bill?format=html`);
      return res.data.html;
    },
    enabled: !!id,
  });
}

export const ORDER_STATUS_CONFIG: Record<string, { variant: 'green' | 'red' | 'yellow' | 'blue' | 'slate'; label: string }> = {
  pending: { variant: 'yellow', label: 'Pending' },
  completed: { variant: 'green', label: 'Completed' },
  cancelled: { variant: 'red', label: 'Cancelled' },
};

export const PAYMENT_METHODS = ['cash', 'card', 'bkash', 'nagad'] as const;

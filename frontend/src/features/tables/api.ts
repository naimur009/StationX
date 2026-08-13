'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface TableResponse {
  id: string;
  tableNumber: string;
  capacity: number | null;
  status: 'available' | 'booked';
  currentOrderId: string | null;
  bookedBy: 'order' | 'manual' | null;
  bookedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TableListResponse {
  data: TableResponse[];
}

interface TableListParams {
  status?: 'available' | 'booked';
}

export function useTableList(params?: TableListParams) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);

  const qs = searchParams.toString();

  return useQuery({
    queryKey: ['tables', 'list', qs],
    queryFn: () => apiClient<TableListResponse>(`/tables${qs ? `?${qs}` : ''}`),
    staleTime: 10_000,
  });
}

export function useTable(id: string) {
  return useQuery({
    queryKey: ['tables', 'detail', id],
    queryFn: () => apiClient<{ data: TableResponse }>(`/tables/${id}`),
    enabled: !!id,
  });
}

export function useUpdateTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; tableNumber?: string; capacity?: number | null }) => {
      const { id, ...body } = data;
      return apiClient<{ data: TableResponse }>(`/tables/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });
}

export function useUpdateTableStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; status: 'available' | 'booked'; notes?: string }) =>
      apiClient<{ data: TableResponse }>(`/tables/${data.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: data.status, notes: data.notes }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useDeleteTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ data: { success: boolean } }>(`/tables/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });
}

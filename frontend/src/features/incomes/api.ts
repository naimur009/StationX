'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface IncomeResponse {
  id: string;
  amount: number;
  date: string;
  description: string;
  category: string;
  receivedFrom: string;
  receivedBy: { _id: string; name: string };
  paymentMethod: 'cash' | 'card' | 'bkash' | 'nagad';
  createdBy: { _id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

interface IncomesListResponse {
  data: IncomeResponse[];
  meta: { total: number; page: number; limit: number };
}

interface IncomesListParams {
  page?: number;
  limit?: number;
  range?: string;
  from?: string;
  to?: string;
  category?: string;
  paymentMethod?: string;
  receivedBy?: string;
}

export function useIncomesList(params: IncomesListParams) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.range === 'custom') {
    if (params.from && params.to) {
      searchParams.set('range', 'custom');
      searchParams.set('from', params.from);
      searchParams.set('to', params.to);
    }
  } else if (params.range) {
    searchParams.set('range', params.range);
  }
  if (params.category) searchParams.set('category', params.category);
  if (params.paymentMethod) searchParams.set('paymentMethod', params.paymentMethod);
  if (params.receivedBy) searchParams.set('receivedBy', params.receivedBy);

  const qs = searchParams.toString();

  return useQuery({
    queryKey: ['incomes', 'list', qs],
    queryFn: () => apiClient<IncomesListResponse>(`/incomes${qs ? `?${qs}` : ''}`),
    placeholderData: keepPreviousData,
  });
}

export function useIncome(id: string) {
  return useQuery({
    queryKey: ['incomes', 'detail', id],
    queryFn: () => apiClient<{ data: IncomeResponse }>(`/incomes/${id}`),
    enabled: !!id,
  });
}

export function useCreateIncome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      amount: number;
      date: string;
      description: string;
      category: string;
      receivedFrom: string;
      receivedBy: string;
      paymentMethod: 'cash' | 'card' | 'bkash' | 'nagad';
    }) =>
      apiClient<{ data: IncomeResponse }>('/incomes', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateIncome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      id: string;
      amount?: number;
      date?: string;
      description?: string;
      category?: string;
      receivedFrom?: string;
      receivedBy?: string;
      paymentMethod?: 'cash' | 'card' | 'bkash' | 'nagad';
    }) => {
      const { id, ...body } = data;
      return apiClient<{ data: IncomeResponse }>(`/incomes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export interface ReferenceDataEmployee {
  id: string;
  name: string;
}

interface ReferenceDataResponse {
  data: {
    employees: ReferenceDataEmployee[];
  };
}

export function useIncomeReferenceData() {
  return useQuery({
    queryKey: ['incomes', 'reference-data'],
    queryFn: () => apiClient<ReferenceDataResponse>('/incomes/reference-data'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDeleteIncome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ data: { success: boolean } }>(`/incomes/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

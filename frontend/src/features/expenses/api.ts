'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface ExpenseResponse {
  id: string;
  amount: number;
  date: string;
  description: string;
  category: string;
  vendorId?: { _id: string; name: string } | null;
  paidBy: { _id: string; name: string; email: string };
  paidTo: string;
  paymentMethod: 'cash' | 'card' | 'bkash' | 'nagad';
  createdBy: { _id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

interface ExpensesListResponse {
  data: ExpenseResponse[];
  meta: { total: number; page: number; limit: number };
}

interface ExpensesListParams {
  page?: number;
  limit?: number;
  range?: string;
  from?: string;
  to?: string;
  category?: string;
  vendorId?: string;
  paymentMethod?: string;
  paidBy?: string;
}

export function useExpensesList(params: ExpensesListParams) {
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
  if (params.vendorId) searchParams.set('vendorId', params.vendorId);
  if (params.paymentMethod) searchParams.set('paymentMethod', params.paymentMethod);
  if (params.paidBy) searchParams.set('paidBy', params.paidBy);

  const qs = searchParams.toString();

  return useQuery({
    queryKey: ['expenses', 'list', qs],
    queryFn: () => apiClient<ExpensesListResponse>(`/expenses${qs ? `?${qs}` : ''}`),
  });
}

export function useExpense(id: string) {
  return useQuery({
    queryKey: ['expenses', 'detail', id],
    queryFn: () => apiClient<{ data: ExpenseResponse }>(`/expenses/${id}`),
    enabled: !!id,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      amount: number;
      date: string;
      description: string;
      category: string;
      vendorId?: string;
      paidBy: string;
      paidTo: string;
      paymentMethod: 'cash' | 'card' | 'bkash' | 'nagad';
    }) =>
      apiClient<{ data: ExpenseResponse }>('/expenses', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      id: string;
      amount?: number;
      date?: string;
      description?: string;
      category?: string;
      vendorId?: string | null;
      paidBy?: string;
      paidTo?: string;
      paymentMethod?: 'cash' | 'card' | 'bkash' | 'nagad';
    }) => {
      const { id, ...body } = data;
      return apiClient<{ data: ExpenseResponse }>(`/expenses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export interface ReferenceDataVendor {
  id: string;
  name: string;
}

export interface ReferenceDataUser {
  id: string;
  name: string;
  email: string;
}

interface ReferenceDataResponse {
  data: {
    vendors: ReferenceDataVendor[];
    users: ReferenceDataUser[];
  };
}

export function useExpenseReferenceData() {
  return useQuery({
    queryKey: ['expenses', 'reference-data'],
    queryFn: () => apiClient<ReferenceDataResponse>('/expenses/reference-data'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ data: { success: boolean } }>(`/expenses/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface AdvanceResponse {
  _id: string;
  amount: number;
  date: string;
  note?: string;
  createdBy: { _id: string; name: string };
}

export interface SalaryResponse {
  id: string;
  employeeId: { _id: string; name: string };
  baseSalary: number;
  month: number;
  year: number;
  advances: AdvanceResponse[];
  totalPaid: number;
  remainingBalance: number;
  status: 'active' | 'paid' | 'cancelled';
  createdBy: { _id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

interface SalariesListResponse {
  data: SalaryResponse[];
  meta: { total: number; page: number; limit: number };
}

interface SalariesListParams {
  page?: number;
  limit?: number;
  month?: number;
  year?: number;
  employeeId?: string;
  status?: string;
}

export function useSalariesList(params: SalariesListParams) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.month) searchParams.set('month', String(params.month));
  if (params.year) searchParams.set('year', String(params.year));
  if (params.employeeId) searchParams.set('employeeId', params.employeeId);
  if (params.status) searchParams.set('status', params.status);

  const qs = searchParams.toString();

  return useQuery({
    queryKey: ['salaries', 'list', qs],
    queryFn: () => apiClient<SalariesListResponse>(`/salaries${qs ? `?${qs}` : ''}`),
  });
}

export function useSalary(id: string) {
  return useQuery({
    queryKey: ['salaries', 'detail', id],
    queryFn: () => apiClient<{ data: SalaryResponse }>(`/salaries/${id}`),
    enabled: !!id,
  });
}

export function useCreateSalary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      employeeId: string;
      paidAmount: number;
      month: number;
      year: number;
    }) =>
      apiClient<{ data: SalaryResponse }>('/salaries', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaries'] });
    },
  });
}

export function useAddAdvance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      salaryId: string;
      amount: number;
      date: string;
      note?: string;
    }) =>
      apiClient<{ data: SalaryResponse }>(`/salaries/${data.salaryId}/advance`, {
        method: 'PATCH',
        body: JSON.stringify({ amount: data.amount, date: data.date, note: data.note }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaries'] });
    },
  });
}

export function useUpdateSalaryStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { salaryId: string; status: 'active' | 'paid' | 'cancelled' }) =>
      apiClient<{ data: SalaryResponse }>(`/salaries/${data.salaryId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: data.status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaries'] });
    },
  });
}

export function useDeleteSalary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ data: { success: boolean } }>(`/salaries/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaries'] });
    },
  });
}

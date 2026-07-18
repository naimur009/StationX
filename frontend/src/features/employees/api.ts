'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
export interface EmployeeResponse {
  id: string;
  name: string;
  phone: string;
  address: string;
  baseSalary: number;
  createdAt: string;
  updatedAt: string;
}

interface EmployeesListResponse {
  data: EmployeeResponse[];
  meta: { total: number; page: number; limit: number };
}

interface EmployeesListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export function useEmployeesList(params: EmployeesListParams) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.search) searchParams.set('search', params.search);

  const qs = searchParams.toString();

  return useQuery({
    queryKey: ['employees', 'list', qs],
    queryFn: () => apiClient<EmployeesListResponse>(`/employees${qs ? `?${qs}` : ''}`),
    placeholderData: keepPreviousData,
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ['employees', 'detail', id],
    queryFn: () => apiClient<{ data: EmployeeResponse }>(`/employees/${id}`),
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      phone: string;
      address?: string;
      baseSalary?: number;
    }) =>
      apiClient<{ data: EmployeeResponse }>('/employees', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: {
      id: string;
      name?: string;
      phone?: string;
      address?: string;
      baseSalary?: number;
    }) =>
      apiClient<{ data: EmployeeResponse }>(`/employees/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ data: { success: boolean } }>(`/employees/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

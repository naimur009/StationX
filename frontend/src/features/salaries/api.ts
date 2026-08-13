'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
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
  paidAt?: string;
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
    placeholderData: keepPreviousData,
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
    mutationFn: ({ id, force }: { id: string; force?: boolean }) =>
      apiClient<{ data: { success: boolean } }>(`/salaries/${id}${force ? '?force=true' : ''}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaries'] });
    },
  });
}

// ---- Salary Adjustments (Bonus / Cut) ----

export interface AdjustmentResponse {
  id: string;
  employeeId: string;
  salaryId?: string;
  type: 'bonus' | 'cut';
  amount: number;
  reason: string;
  date: string;
  month: number;
  year: number;
  createdBy: { _id: string; name: string };
  createdAt: string;
}

interface AdjustmentsListResponse {
  data: AdjustmentResponse[];
  meta: { total: number; page: number; limit: number };
}

interface AdjustmentsListParams {
  employeeId?: string;
  salaryId?: string;
  type?: 'bonus' | 'cut';
  month?: number;
  year?: number;
  page?: number;
  limit?: number;
}

export function useAdjustmentsList(params: AdjustmentsListParams, enabled = true) {
  const searchParams = new URLSearchParams();
  if (params.employeeId) searchParams.set('employeeId', params.employeeId);
  if (params.salaryId) searchParams.set('salaryId', params.salaryId);
  if (params.type) searchParams.set('type', params.type);
  if (params.month) searchParams.set('month', String(params.month));
  if (params.year) searchParams.set('year', String(params.year));
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));

  const qs = searchParams.toString();

  return useQuery({
    queryKey: ['salary-adjustments', qs],
    queryFn: () => apiClient<AdjustmentsListResponse>(`/salary-adjustments${qs ? `?${qs}` : ''}`),
    enabled,
  });
}

export function useCreateAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
      mutationFn: (data: {
        employeeId: string;
        salaryId?: string;
        type: 'bonus' | 'cut';
        amount: number;
        reason: string;
        date: string | Date;
        month: number;
        year: number;
      }) =>
      apiClient<{ data: AdjustmentResponse }>('/salary-adjustments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['salary-summary'] });
      queryClient.invalidateQueries({ queryKey: ['salary-report'] });
    },
  });
}

export function useUpdateAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      id: string;
      type?: 'bonus' | 'cut';
      amount?: number;
      reason?: string;
      date?: string | Date;
    }) =>
      apiClient<{ data: AdjustmentResponse }>(`/salary-adjustments/${data.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          type: data.type,
          amount: data.amount,
          reason: data.reason,
          date: data.date,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['salary-summary'] });
      queryClient.invalidateQueries({ queryKey: ['salary-report'] });
    },
  });
}

export function useDeleteAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ data: { success: boolean } }>(`/salary-adjustments/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['salary-summary'] });
      queryClient.invalidateQueries({ queryKey: ['salary-report'] });
    },
  });
}

// ---- Salary Report ----

export interface EmployeeReportEntry {
  employeeId: string;
  employeeName: string;
  baseSalary: number;
  totalBonus: number;
  totalCut: number;
  netSalary: number;
  totalPaid: number;
  salaryStatus: string;
  paidAt?: string;
}

export interface SalaryReportResponse {
  period: { month?: number; year: number };
  grandTotalBaseSalary: number;
  grandTotalBonus: number;
  grandTotalCut: number;
  grandTotalNet: number;
  grandTotalPaid: number;
  employees: EmployeeReportEntry[];
  employeeCount: number;
}

interface ReportParams {
  month?: number;
  year: number;
}

export function useSalaryReport(params: ReportParams) {
  const searchParams = new URLSearchParams();
  searchParams.set('year', String(params.year));
  if (params.month) searchParams.set('month', String(params.month));

  const qs = searchParams.toString();

  return useQuery({
    queryKey: ['salary-report', qs],
    queryFn: () => apiClient<{ data: SalaryReportResponse }>(`/salaries/report?${qs}`),
    enabled: !!params.year,
  });
}

// ---- Employee Report (month-by-month for a single employee) ----

export interface EmployeeMonthData {
  month: number;
  year: number;
  baseSalary: number;
  totalBonus: number;
  totalCut: number;
  netSalary: number;
  totalPaid: number;
  remainingBalance: number;
  status: string;
  paidAt?: string;
  adjustments: Array<{
    id: string;
    type: 'bonus' | 'cut';
    amount: number;
    reason: string;
    date: string;
  }>;
}

export interface EmployeeReportResponse {
  employeeId: string;
  employeeName: string;
  year: number;
  months: EmployeeMonthData[];
}

interface EmployeeReportParams {
  employeeId: string;
  year: number;
}

export function useEmployeeReport(params: EmployeeReportParams) {
  const searchParams = new URLSearchParams();
  searchParams.set('year', String(params.year));
  const qs = searchParams.toString();

  return useQuery({
    queryKey: ['salary-employee-report', params.employeeId, qs],
    queryFn: () => apiClient<{ data: EmployeeReportResponse }>(`/salaries/report/employee/${params.employeeId}?${qs}`),
    enabled: !!params.employeeId && !!params.year,
  });
}

// ---- Salary Summary ----

export interface SummaryResponse {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  totalSalary: number;
  totalBonus: number;
  totalCut: number;
  totalPaid: number;
  netSalary: number;
  createdAt: string;
  updatedAt: string;
}

interface SummaryParams {
  employeeId: string;
  month: number;
  year: number;
}

export function useSalarySummary(params: SummaryParams) {
  const searchParams = new URLSearchParams();
  searchParams.set('employeeId', params.employeeId);
  searchParams.set('month', String(params.month));
  searchParams.set('year', String(params.year));

  const qs = searchParams.toString();

  return useQuery({
    queryKey: ['salary-summary', qs],
    queryFn: () => apiClient<{ data: SummaryResponse }>(`/salary-summary?${qs}`),
    enabled: !!params.employeeId && !!params.month && !!params.year,
  });
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface StaffUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export interface MarkedBy {
  _id: string;
  name: string;
}

export interface AttendanceRecord {
  id: string;
  user: StaffUser;
  date: string;
  status: 'present' | 'absent' | 'late' | 'half-day';
  checkInAt: string | null;
  checkOutAt: string | null;
  notes: string | null;
  markedBy: MarkedBy;
  createdAt: string;
  updatedAt: string;
}

export interface StaffAttendanceItem {
  user: StaffUser;
  attendance: AttendanceRecord | null;
}

export interface TodayResponse {
  date: string;
  summary: {
    present: number;
    absent: number;
    late: number;
    halfDay: number;
    unmarked: number;
    total: number;
  };
  staff: StaffAttendanceItem[];
}

interface AttendanceListResponse {
  data: AttendanceRecord[];
  meta: { total: number; page: number; limit: number };
}

interface BatchResult {
  created: number;
  skipped: number;
  errors: Array<{ userId: string; code: string; message: string }>;
}

interface AttendanceListParams {
  userId?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

interface MarkAttendancePayload {
  userId: string;
  status: 'present' | 'absent' | 'late' | 'half-day';
  date?: string;
  checkInAt?: string;
  checkOutAt?: string;
  notes?: string;
}

interface BatchMarkPayload {
  date?: string;
  records: Array<{
    userId: string;
    status: 'present' | 'absent' | 'late' | 'half-day';
    checkInAt?: string;
    checkOutAt?: string;
    notes?: string;
  }>;
}

export function useTodayStaff(date?: string) {
  const qs = date ? `?date=${encodeURIComponent(date)}` : '';
  return useQuery({
    queryKey: ['attendance', 'today', date],
    queryFn: () => apiClient<TodayResponse>(`/attendance/today${qs}`),
  });
}

export function useUserAttendanceMonth(userId: string, year: number, month: number) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const qs = `?userId=${encodeURIComponent(userId)}&from=${from}&to=${to}&limit=31`;

  return useQuery({
    queryKey: ['attendance', 'month', userId, year, month],
    queryFn: () => apiClient<AttendanceListResponse>(`/attendance${qs}`),
    enabled: !!userId,
  });
}

export function useAttendanceList(params: AttendanceListParams) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.userId) searchParams.set('userId', params.userId);
  if (params.status) searchParams.set('status', params.status);
  if (params.from) searchParams.set('from', params.from);
  if (params.to) searchParams.set('to', params.to);
  const qs = searchParams.toString();

  return useQuery({
    queryKey: ['attendance', 'list', qs],
    queryFn: () => apiClient<AttendanceListResponse>(`/attendance${qs ? `?${qs}` : ''}`),
  });
}

export function useAttendanceDetail(id: string) {
  return useQuery({
    queryKey: ['attendance', 'detail', id],
    queryFn: () => apiClient<{ data: AttendanceRecord }>(`/attendance/${id}`),
    enabled: !!id,
  });
}

export function useMarkAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MarkAttendancePayload) =>
      apiClient<{ data: AttendanceRecord }>('/attendance', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

export function useBatchMarkAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BatchMarkPayload) =>
      apiClient<{ data: BatchResult }>('/attendance/batch', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

export function useUpdateAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; status?: string; checkInAt?: string | null; checkOutAt?: string | null; notes?: string }) => {
      const { id, ...body } = data;
      return apiClient<{ data: AttendanceRecord }>(`/attendance/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

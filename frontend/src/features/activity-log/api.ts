'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ActivityLogFilters, ActivityLogListResponse } from './schema';

export function useActivityLogs(filters: ActivityLogFilters) {
  const params = new URLSearchParams();
  params.set('page', String(filters.page));
  params.set('limit', String(filters.limit));
  if (filters.actor) params.set('actor', filters.actor);
  if (filters.module) params.set('module', filters.module);
  if (filters.action) params.set('action', filters.action);
  if (filters.search) params.set('search', filters.search);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const qs = params.toString();

  return useQuery({
    queryKey: ['activity-log', qs],
    queryFn: () => apiClient<ActivityLogListResponse>(`/activity-log?${qs}`),
    placeholderData: keepPreviousData,
  });
}

export function useClearActivityLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient<{ data: { success: boolean } }>('/activity-log', {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-log'] });
    },
  });
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface TaskResponse {
  id: string;
  title: string;
  description?: string;
  assignedTo: { _id: string; name: string };
  assignedBy: { _id: string; name: string };
  priority: 'low' | 'medium' | 'high';
  deadline: string;
  status: 'pending' | 'in_progress' | 'completed';
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface TasksListResponse {
  data: TaskResponse[];
  meta: { total: number; page: number; limit: number };
}

interface TasksListParams {
  page?: number;
  limit?: number;
  assignedTo?: string;
  status?: string;
  priority?: string;
  sort?: string;
}

export function useTasksList(params: TasksListParams) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.assignedTo) searchParams.set('assignedTo', params.assignedTo);
  if (params.status) searchParams.set('status', params.status);
  if (params.priority) searchParams.set('priority', params.priority);
  if (params.sort) searchParams.set('sort', params.sort);

  const qs = searchParams.toString();

  return useQuery({
    queryKey: ['tasks', 'list', qs],
    queryFn: () => apiClient<TasksListResponse>(`/tasks${qs ? `?${qs}` : ''}`),
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['tasks', 'detail', id],
    queryFn: () => apiClient<{ data: TaskResponse }>(`/tasks/${id}`),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      assignedTo: string;
      priority: 'low' | 'medium' | 'high';
      deadline: Date;
    }) =>
      apiClient<{ data: TaskResponse }>('/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      id: string;
      title?: string;
      description?: string;
      assignedTo?: string;
      priority?: 'low' | 'medium' | 'high';
      deadline?: Date;
    }) => {
      const { id, ...body } = data;
      return apiClient<{ data: TaskResponse }>(`/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; status: 'in_progress' | 'completed' }) =>
      apiClient<{ data: TaskResponse }>(`/tasks/${data.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: data.status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ data: { success: boolean } }>(`/tasks/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

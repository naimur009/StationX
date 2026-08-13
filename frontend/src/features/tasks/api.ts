'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

export function useAssignableEmployees() {
  return useQuery({
    queryKey: ['tasks', 'assignable-employees'],
    queryFn: () => apiClient<{ data: { id: string; name: string }[] }>('/tasks/assignable-employees'),
    staleTime: 60_000,
  });
}

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
  status?: 'pending' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
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
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['tasks', 'detail', id],
    queryFn: () => apiClient<{ data: TaskResponse }>(`/tasks/${id}`),
    enabled: !!id,
    staleTime: 60_000,
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
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create task');
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
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update task');
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
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update task status');
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
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete task');
    },
  });
}

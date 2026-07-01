'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, User, Clock, Play, CheckCheck, Trash2 } from 'lucide-react';
import { useTask, useDeleteTask, useUpdateTaskStatus, type TaskResponse } from '../api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PermissionGate from '@/components/shared/PermissionGate';
import { Dialog } from '@/components/ui/dialog';
import { AppError } from '@/lib/utils';

interface TaskDetailProps {
  taskId: string;
  onEdit: (task: TaskResponse) => void;
}

const priorityBadgeVariant: Record<string, 'slate' | 'yellow' | 'red'> = {
  low: 'slate',
  medium: 'yellow',
  high: 'red',
};

const statusBadgeVariant: Record<string, 'yellow' | 'blue' | 'green'> = {
  pending: 'yellow',
  in_progress: 'blue',
  completed: 'green',
};

const priorityLabel: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

const statusLabel: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isOverdue(deadline: string, status: string): boolean {
  if (status === 'completed') return false;
  return new Date(deadline) < new Date();
}

export default function TaskDetail({ taskId, onEdit }: TaskDetailProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteTask = useDeleteTask();
  const updateTaskStatus = useUpdateTaskStatus();

  const { data, isLoading, isError } = useTask(taskId);
  const task = data?.data;

  async function handleDelete() {
    if (!task) return;
    setDeleteError(null);

    try {
      await deleteTask.mutateAsync(task.id);
      setDeleteOpen(false);
      router.push('/tasks');
    } catch (err) {
      if (err instanceof AppError) {
        setDeleteError(err.message);
      } else {
        setDeleteError('Failed to delete task');
      }
    }
  }

  async function handleStatusTransition(status: 'in_progress' | 'completed') {
    if (!task) return;
    try {
      await updateTaskStatus.mutateAsync({ id: task.id, status });
    } catch {
      // Error handled by React Query cache invalidation
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !task) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-12 text-center">
        <p className="text-sm text-red-600">
          {isError ? 'Failed to load task details.' : 'Task not found.'}
        </p>
        <Button variant="ghost" size="sm" className="mt-4" onClick={() => router.push('/tasks')}>
          Back to Tasks
        </Button>
      </div>
    );
  }

  const overdue = isOverdue(task.deadline, task.status);

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <button
        onClick={() => router.push('/tasks')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Tasks
      </button>

      {/* Header card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">{task.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={priorityBadgeVariant[task.priority]}>{priorityLabel[task.priority]}</Badge>
              <Badge variant={statusBadgeVariant[task.status]}>{statusLabel[task.status]}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {task.status !== 'completed' && (
              <>
                {task.status === 'pending' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleStatusTransition('in_progress')}
                    disabled={updateTaskStatus.isPending}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Start Task
                  </Button>
                )}
                {task.status === 'in_progress' && (
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => handleStatusTransition('completed')}
                    disabled={updateTaskStatus.isPending}
                  >
                    <CheckCheck className="h-4 w-4 mr-1" />
                    Mark Complete
                  </Button>
                )}
              </>
            )}
            <PermissionGate module="tasks" action="edit">
              <Button variant="secondary" size="sm" onClick={() => onEdit(task)}>
                Edit
              </Button>
            </PermissionGate>
            <PermissionGate module="tasks" action="delete">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => { setDeleteError(null); setDeleteOpen(true); }}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </PermissionGate>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-base font-bold text-slate-800">Description</h2>
        {task.description ? (
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{task.description}</p>
        ) : (
          <p className="text-sm text-slate-400">No description provided.</p>
        )}
      </div>

      {/* Assignment & Deadline */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-800">Assignment</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Assigned To</p>
                {task.assignedTo ? (
                  <>
                    <p className="text-sm font-medium text-slate-700">{task.assignedTo.name}</p>
                    <p className="text-xs text-slate-400">{task.assignedTo.email}</p>
                  </>
                ) : (
                  <p className="text-sm font-medium text-slate-400">Unassigned</p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <User className="h-4 w-4 text-slate-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Assigned By</p>
                <p className="text-sm font-medium text-slate-700">{task.assignedBy.name}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-800">Deadline</h2>
          <div className="flex items-start gap-3">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${overdue ? 'bg-red-100' : 'bg-slate-100'}`}>
              <Calendar className={`h-4 w-4 ${overdue ? 'text-red-500' : 'text-slate-500'}`} />
            </div>
            <div>
              <p className={`text-sm font-medium ${overdue ? 'text-red-600' : 'text-slate-700'}`}>
                {formatDate(task.deadline)}
              </p>
              {overdue && (
                <p className="mt-0.5 text-xs font-medium text-red-500">Overdue</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-slate-800">Timeline</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
              <Clock className="h-4 w-4 text-slate-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Created</p>
              <p className="text-sm text-slate-700">{formatDateTime(task.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
              <Clock className="h-4 w-4 text-slate-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Last Updated</p>
              <p className="text-sm text-slate-700">{formatDateTime(task.updatedAt)}</p>
            </div>
          </div>
          {task.completedAt && (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100">
                <CheckCheck className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-green-600">Completed</p>
                <p className="text-sm text-slate-700">{formatDateTime(task.completedAt)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteError(null); }}
        title="Delete Task"
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => { setDeleteOpen(false); setDeleteError(null); }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="md"
              onClick={handleDelete}
              disabled={deleteTask.isPending}
            >
              {deleteTask.isPending ? 'Deleting\u2026' : 'Delete'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {deleteError && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {deleteError}
            </div>
          )}
          <p className="text-sm text-slate-600">
            Are you sure you want to permanently delete the task &ldquo;<span className="font-semibold text-slate-800">{task.title}</span>&rdquo;? This action cannot be undone.
          </p>
        </div>
      </Dialog>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import PermissionGate from '@/components/shared/PermissionGate';
import TaskList from '@/features/tasks/components/TaskList';
import TaskForm from '@/features/tasks/components/TaskForm';
import { useDeleteTask, type TaskResponse } from '@/features/tasks/api';
import { AppError } from '@/lib/utils';

export default function TasksPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<TaskResponse | null>(null);
  const [deleteTask, setDeleteTask] = useState<TaskResponse | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteMutation = useDeleteTask();

  async function handleDeleteConfirm() {
    if (!deleteTask) return;
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(deleteTask.id);
      setDeleteTask(null);
    } catch (err) {
      if (err instanceof AppError) {
        setDeleteError(err.message);
      } else {
        setDeleteError('Failed to delete task');
      }
    }
  }

  return (
    <PermissionGate module="tasks" action="view">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Tasks</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage and assign tasks to your team
            </p>
          </div>
          <PermissionGate module="tasks" action="create">
            <Button variant="primary" size="md" onClick={() => setCreateOpen(true)}>
              Add Task
            </Button>
          </PermissionGate>
        </div>

        <TaskList
          onEdit={(task) => setEditTask(task)}
          onDelete={(task) => setDeleteTask(task)}
        />

        <TaskForm
          open={createOpen}
          task={null}
          onClose={() => setCreateOpen(false)}
        />
        <TaskForm
          open={!!editTask}
          task={editTask}
          onClose={() => setEditTask(null)}
        />

        <Dialog
          open={!!deleteTask}
          onClose={() => { setDeleteTask(null); setDeleteError(null); }}
          title="Delete Task"
          size="sm"
          footer={
            <>
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => { setDeleteTask(null); setDeleteError(null); }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="md"
                disabled={deleteMutation.isPending}
                onClick={handleDeleteConfirm}
              >
                {deleteMutation.isPending ? 'Deleting\u2026' : 'Delete'}
              </Button>
            </>
          }
        >
          {deleteError && (
            <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {deleteError}
            </div>
          )}
          <p className="text-sm text-slate-600">
            Are you sure you want to permanently delete task{' '}
            <span className="font-semibold text-slate-800">&ldquo;{deleteTask?.title}&rdquo;</span>?
            This cannot be undone.
          </p>
        </Dialog>
      </div>
    </PermissionGate>
  );
}

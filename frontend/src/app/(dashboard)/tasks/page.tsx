'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import PermissionGate from '@/components/shared/PermissionGate';
import TaskList from '@/features/tasks/components/TaskList';
import TaskForm from '@/features/tasks/components/TaskForm';
import type { TaskResponse } from '@/features/tasks/api';

export default function TasksPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<TaskResponse | null>(null);
  const [deleteTask, setDeleteTask] = useState<TaskResponse | null>(null);

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
      </div>
    </PermissionGate>
  );
}

'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import PermissionGate from '@/components/shared/PermissionGate';
import TaskDetail from '@/features/tasks/components/TaskDetail';
import TaskForm from '@/features/tasks/components/TaskForm';
import type { TaskResponse } from '@/features/tasks/api';

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = params.taskId as string;
  const [editTask, setEditTask] = useState<TaskResponse | null>(null);

  return (
    <PermissionGate module="tasks" action="view">
      <TaskDetail
        taskId={taskId}
        onEdit={(task) => setEditTask(task)}
      />
      <TaskForm
        open={!!editTask}
        task={editTask}
        onClose={() => setEditTask(null)}
      />
    </PermissionGate>
  );
}

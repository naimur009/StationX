'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateTask, useUpdateTask, useAssignableEmployees, type TaskResponse } from '../api';
import { createTaskSchema, updateTaskSchema } from '../schema';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';

interface TaskFormProps {
  open: boolean;
  task: TaskResponse | null;
  onClose: () => void;
}

interface TaskFormValues {
  title?: string;
  description?: string;
  assignedTo?: string;
  priority?: 'low' | 'medium' | 'high';
  deadline?: Date;
}

export default function TaskForm({ open, task, onClose }: TaskFormProps) {
  const [error, setError] = useState<string | null>(null);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const isEdit = !!task;
  const schema = isEdit ? updateTaskSchema : createTaskSchema;

  const { data: employeesData } = useAssignableEmployees();
  const employees = employeesData?.data || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      assignedTo: '',
      priority: 'medium' as const,
      deadline: undefined as Date | undefined,
    },
  });

  useEffect(() => {
    if (open) {
      if (task) {
        reset({
          title: task.title,
          description: task.description ?? '',
          assignedTo: task.assignedTo?._id ?? '',
          priority: task.priority,
          deadline: new Date(task.deadline),
        });
      } else {
        reset({
          title: '',
          description: '',
          assignedTo: '',
          priority: 'medium',
          deadline: undefined,
        });
      }
      setError(null);
    }
  }, [open, task, reset]);

  async function onSubmit(data: TaskFormValues) {
    setError(null);

    const description = data.description || undefined;

    try {
      if (isEdit && task) {
        await updateTask.mutateAsync({
          id: task.id,
          title: data.title ?? '',
          description,
          assignedTo: data.assignedTo ?? '',
          priority: data.priority ?? 'medium',
          deadline: data.deadline,
        });
      } else {
        await createTask.mutateAsync({
          title: data.title ?? '',
          description,
          assignedTo: data.assignedTo ?? '',
          priority: data.priority ?? 'medium',
          deadline: data.deadline as Date,
        });
      }
      reset();
      onClose();
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError(isEdit ? 'Failed to update task' : 'Failed to create task');
      }
    }
  }

  function handleClose() {
    reset();
    setError(null);
    onClose();
  }

  const isPending = isEdit ? updateTask.isPending : createTask.isPending;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Task' : 'Create Task'}
      size="md"
      footer={
        <>
          <Button type="button" variant="ghost" size="md" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={isPending}
            onClick={handleSubmit(onSubmit)}
          >
            {isPending ? 'Saving\u2026' : isEdit ? 'Save Changes' : 'Create Task'}
          </Button>
        </>
      }
    >
      {error && (
        <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label htmlFor="task-title" className="mb-1.5 block text-sm font-medium text-slate-700">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="task-title"
            type="text"
            placeholder="e.g. Clean the walk-in freezer"
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring ${
              errors.title ? 'border-red-400' : 'border-slate-300'
            }`}
            {...register('title')}
          />
          {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message as string}</p>}
        </div>

        <div>
          <label htmlFor="task-description" className="mb-1.5 block text-sm font-medium text-slate-700">
            Description
          </label>
          <textarea
            id="task-description"
            rows={3}
            placeholder="Optional details about the task"
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
            {...register('description')}
          />
          {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message as string}</p>}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="task-assignee" className="mb-1.5 block text-sm font-medium text-slate-700">
              Assignee <span className="text-red-500">*</span>
            </label>
            <select
              id="task-assignee"
              className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring ${
                errors.assignedTo ? 'border-red-400' : 'border-slate-300'
              }`}
              {...register('assignedTo')}
            >
              <option value="">Select a staff member</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.name}</option>
              ))}
            </select>
            {errors.assignedTo && <p className="mt-1 text-xs text-red-500">{errors.assignedTo.message as string}</p>}
          </div>

          <div>
            <label htmlFor="task-priority" className="mb-1.5 block text-sm font-medium text-slate-700">
              Priority <span className="text-red-500">*</span>
            </label>
            <select
              id="task-priority"
              className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring ${
                errors.priority ? 'border-red-400' : 'border-slate-300'
              }`}
              {...register('priority')}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            {errors.priority && <p className="mt-1 text-xs text-red-500">{errors.priority.message as string}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="task-deadline" className="mb-1.5 block text-sm font-medium text-slate-700">
            Deadline <span className="text-red-500">*</span>
          </label>
          <input
            id="task-deadline"
            type="date"
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring ${
              errors.deadline ? 'border-red-400' : 'border-slate-300'
            }`}
            {...register('deadline')}
          />
          {errors.deadline && <p className="mt-1 text-xs text-red-500">{errors.deadline.message as string}</p>}
        </div>
      </form>
    </Dialog>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { Calendar, User, Play, CheckCheck, MoreHorizontal, Edit3, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useUpdateTaskStatus, type TaskResponse } from '../api';
import { Badge } from '@/components/ui/badge';
import PermissionGate from '@/components/shared/PermissionGate';

interface TaskCardProps {
  task: TaskResponse;
  onEdit: (task: TaskResponse) => void;
  onDelete: (task: TaskResponse) => void;
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

function getInitials(name: string): string {
  return name.charAt(0).toUpperCase();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isOverdue(deadline: string, status: string): boolean {
  if (status === 'completed') return false;
  return new Date(deadline) < new Date();
}

export default function TaskCard({ task, onEdit, onDelete }: TaskCardProps) {
  const router = useRouter();
  const updateTaskStatus = useUpdateTaskStatus();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const overdue = isOverdue(task.deadline, task.status);

  async function handleStatusTransition(status: 'in_progress' | 'completed') {
    try {
      await updateTaskStatus.mutateAsync({ id: task.id, status });
    } catch {
      // Error handled by React Query cache invalidation
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <button
            onClick={() => router.push(`/tasks/${task.id}`)}
            className="text-left font-semibold text-slate-800 hover:text-primary transition-colors line-clamp-1"
          >
            {task.title}
          </button>
        </div>
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-50 w-36 rounded-xl border border-slate-200 bg-white shadow-xl py-1">
              <PermissionGate module="tasks" action="edit">
                <button
                  onClick={() => { setMenuOpen(false); onEdit(task); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit
                </button>
              </PermissionGate>
              <PermissionGate module="tasks" action="delete">
                <button
                  onClick={() => { setMenuOpen(false); onDelete(task); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </PermissionGate>
            </div>
          )}
        </div>
      </div>

      {task.description && (
        <p className="mt-2 text-sm text-slate-500 line-clamp-2">{task.description}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant={priorityBadgeVariant[task.priority]}>{priorityLabel[task.priority]}</Badge>
        <Badge variant={statusBadgeVariant[task.status]}>{statusLabel[task.status]}</Badge>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        {task.assignedTo ? (
          <div className="flex items-center gap-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-semibold text-indigo-700">
              {getInitials(task.assignedTo.name)}
            </div>
            <span className="truncate max-w-[100px]">{task.assignedTo.name}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-400">Unassigned</span>
          </div>
        )}
        <div className={`flex items-center gap-1.5 ${overdue ? 'text-red-500 font-medium' : ''}`}>
          <Calendar className="h-3.5 w-3.5" />
          <span>{formatDate(task.deadline)}</span>
          {overdue && <span className="text-[10px]">(Overdue)</span>}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
        {task.status === 'pending' && (
          <button
            onClick={() => handleStatusTransition('in_progress')}
            disabled={updateTaskStatus.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors disabled:opacity-50"
          >
            <Play className="h-3 w-3" />
            Start
          </button>
        )}
        {task.status === 'in_progress' && (
          <button
            onClick={() => handleStatusTransition('completed')}
            disabled={updateTaskStatus.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
          >
            <CheckCheck className="h-3 w-3" />
            Mark Complete
          </button>
        )}
        {task.status === 'completed' && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600">
            <CheckCheck className="h-3.5 w-3.5" />
            Done
          </span>
        )}
      </div>
    </div>
  );
}

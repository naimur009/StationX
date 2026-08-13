import Task, { ITask } from '../../models/Task';
import Employee from '../../models/Employee';
import { createError } from '../../middleware/errorHandler';
import { getIO } from '../../config/socket';
import { paginate } from '../../lib/pagination';
import type {
  CreateTaskDto,
  UpdateTaskDto,
  UpdateTaskStatusDto,
  ListTasksDto,
} from './tasks.validation';

interface TaskResponse {
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

function toResponse(task: ITask): TaskResponse {
  return {
    id: task._id.toString(),
    title: task.title,
    description: task.description,
    assignedTo: task.assignedTo as unknown as { _id: string; name: string },
    assignedBy: task.assignedBy as unknown as { _id: string; name: string },
    priority: task.priority,
    deadline: task.deadline instanceof Date ? task.deadline.toISOString() : String(task.deadline),
    status: task.status,
    completedAt: task.completedAt instanceof Date ? task.completedAt.toISOString() : undefined,
    createdAt: task.createdAt instanceof Date ? task.createdAt.toISOString() : String(task.createdAt),
    updatedAt: task.updatedAt instanceof Date ? task.updatedAt.toISOString() : String(task.updatedAt),
  };
}

function emitTaskAssigned(taskId: string, assignedTo: string): void {
  try {
    getIO().emit('task:assigned', { taskId, assignedTo });
  } catch {
    // Socket.io not initialized — skip real-time event
  }
}

export async function listTasks(query: ListTasksDto) {
  const filter: Record<string, unknown> = {};

  if (query.assignedTo) {
    filter.assignedTo = query.assignedTo;
  }
  if (query.status) {
    filter.status = query.status;
  }
  if (query.priority) {
    filter.priority = query.priority;
  }

  let sortObj: Record<string, 1 | -1> = { createdAt: -1 };
  if (query.sort) {
    const sortField = query.sort.startsWith('-') ? query.sort.slice(1) : query.sort;
    const sortDir: 1 | -1 = query.sort.startsWith('-') ? -1 : 1;
    if (['deadline', 'createdAt', 'priority'].includes(sortField)) {
      sortObj = { [sortField]: sortDir };
    }
  }

  const { skip, limit } = paginate(query.page, query.limit);

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate('assignedTo', 'name')
      .populate('assignedBy', 'name')
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean(),
    Task.countDocuments(filter),
  ]);

  const data = (tasks as unknown as ITask[]).map(toResponse);

  return {
    data,
    meta: { total, page: query.page, limit: query.limit },
  };
}

export async function getTaskById(id: string) {
  const task = await Task.findById(id)
    .populate('assignedTo', 'name')
    .populate('assignedBy', 'name')
    .lean();

  if (!task) {
    throw createError(404, 'NOT_FOUND', 'Task not found');
  }

  return toResponse(task as unknown as ITask);
}

export async function createTask(dto: CreateTaskDto, userId: string) {
  const employee = await Employee.findById(dto.assignedTo);
  if (!employee) {
    throw createError(404, 'NOT_FOUND', 'Assigned employee not found');
  }

  const task = await Task.create({
    title: dto.title,
    description: dto.description,
    assignedTo: dto.assignedTo,
    assignedBy: userId,
    priority: dto.priority,
    deadline: dto.deadline,
    status: 'pending',
  });

  await task.populate('assignedTo', 'name');
  await task.populate('assignedBy', 'name');

  emitTaskAssigned(task._id.toString(), task.assignedTo.toString());

  return toResponse(task);
}

export async function updateTask(id: string, dto: UpdateTaskDto) {
  if (dto.assignedTo) {
    const employee = await Employee.findById(dto.assignedTo);
    if (!employee) {
      throw createError(404, 'NOT_FOUND', 'Assigned employee not found');
    }
  }

  const currentTask = dto.assignedTo
    ? await Task.findById(id).select('assignedTo')
    : null;

  const updated = await Task.findByIdAndUpdate(
    id,
    { $set: dto },
    { new: true, runValidators: true }
  )
    .populate('assignedTo', 'name')
    .populate('assignedBy', 'name');

  if (!updated) {
    throw createError(404, 'NOT_FOUND', 'Task not found');
  }

  if (dto.assignedTo && currentTask && currentTask.assignedTo.toString() !== dto.assignedTo) {
    emitTaskAssigned(updated._id.toString(), dto.assignedTo);
  }

  return toResponse(updated);
}

export async function updateTaskStatus(id: string, status: UpdateTaskStatusDto['status']) {
  const task = await Task.findById(id);
  if (!task) {
    throw createError(404, 'NOT_FOUND', 'Task not found');
  }

  if (status === 'completed' && task.status !== 'completed') {
    task.completedAt = new Date();
  }

  if (status !== 'completed' && task.status === 'completed') {
    task.completedAt = undefined;
  }

  task.status = status;
  await task.save();

  await task.populate('assignedTo', 'name');
  await task.populate('assignedBy', 'name');

  return toResponse(task);
}

export async function listAssignableEmployees() {
  const employees = await Employee.find({}, 'name').sort({ name: 1 }).lean();
  return employees.map((e) => ({ id: e._id.toString(), name: e.name }));
}

export async function deleteTask(id: string) {
  const task = await Task.findByIdAndDelete(id);
  if (!task) {
    throw createError(404, 'NOT_FOUND', 'Task not found');
  }

  return { success: true };
}

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/authenticate';
import * as taskService from './tasks.service';
import type {
  CreateTaskDto,
  UpdateTaskDto,
  ListTasksDto,
} from './tasks.validation';

export async function handleListTasks(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as ListTasksDto;
    const result = await taskService.listTasks(query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleGetTask(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const task = await taskService.getTaskById(req.params.id);
    res.status(200).json({ data: task });
  } catch (error) {
    next(error);
  }
}

export async function handleCreateTask(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: CreateTaskDto = req.body;
    const task = await taskService.createTask(dto, req.user!.id);
    res.status(201).json({ data: task });
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateTask(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: UpdateTaskDto = req.body;
    const task = await taskService.updateTask(req.params.id, dto);
    res.status(200).json({ data: task });
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateTaskStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { status } = req.body as { status: 'in_progress' | 'completed' };
    const task = await taskService.updateTaskStatus(req.params.id, status);
    res.status(200).json({ data: task });
  } catch (error) {
    next(error);
  }
}

export async function handleListAssignableEmployees(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const employees = await taskService.listAssignableEmployees();
    res.status(200).json({ data: employees });
  } catch (error) {
    next(error);
  }
}

export async function handleDeleteTask(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await taskService.deleteTask(req.params.id);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

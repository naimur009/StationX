import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/authenticate';
import { createError } from '../../middleware/errorHandler';
import * as attendanceService from './attendance.service';
import type {
  CreateAttendanceDto,
  BatchAttendanceDto,
  UpdateAttendanceDto,
  TodayQueryDto,
  ListAttendanceQueryDto,
} from './attendance.validation';

export async function handleGetTodayStaff(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as TodayQueryDto;
    const result = await attendanceService.getTodayStaff(query.date);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleMarkAttendance(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      return next(createError(401, 'UNAUTHORIZED', 'Authentication required'));
    }
    const dto: CreateAttendanceDto = req.body;
    const record = await attendanceService.markAttendance(dto, req.user.id);
    res.status(201).json({ data: record });
  } catch (error) {
    next(error);
  }
}

export async function handleBatchMarkAttendance(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      return next(createError(401, 'UNAUTHORIZED', 'Authentication required'));
    }
    const dto: BatchAttendanceDto = req.body;
    const result = await attendanceService.batchMarkAttendance(dto, req.user.id);
    res.status(201).json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateAttendance(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: UpdateAttendanceDto = req.body;
    const record = await attendanceService.updateAttendance(req.params.id, dto);
    res.status(200).json({ data: record });
  } catch (error) {
    next(error);
  }
}

export async function handleListAttendance(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as ListAttendanceQueryDto;
    const result = await attendanceService.listAttendance(query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleGetAttendance(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const record = await attendanceService.getAttendanceById(req.params.id);
    res.status(200).json({ data: record });
  } catch (error) {
    next(error);
  }
}

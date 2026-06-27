import { Request, Response, NextFunction } from 'express';
import { listActivityLogs } from './activity-log.service';
import type { ListActivityLogDto } from './activity-log.validation';

export async function handleListActivityLogs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as ListActivityLogDto;
    const result = await listActivityLogs(query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

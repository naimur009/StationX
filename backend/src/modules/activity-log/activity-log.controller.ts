import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/authenticate';
import { listActivityLogs, clearActivityLog } from './activity-log.service';
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

export async function handleClearActivityLog(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  (req as unknown as Record<string, boolean>).skipActivityLog = true;
  try {
    await clearActivityLog();
    res.status(200).json({ data: { success: true } });
  } catch (error) {
    next(error);
  }
}

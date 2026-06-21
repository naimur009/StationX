import { Request, Response } from 'express';
import { getHealth } from './health.service';

export function handleHealth(_req: Request, res: Response): void {
  const result = getHealth();
  res.json({ data: result });
}

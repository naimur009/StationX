import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/authenticate';
import * as settingsService from './settings.service';
import type { UpdateSettingsDto } from './settings.validation';

export async function handleGetSettings(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const settings = await settingsService.getSettings();
    res.status(200).json({ data: settings });
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateSettings(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: UpdateSettingsDto = req.body;
    const settings = await settingsService.updateSettings(dto);
    res.status(200).json({ data: settings });
  } catch (error) {
    next(error);
  }
}

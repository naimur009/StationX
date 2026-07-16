import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/authenticate';
import * as settingsService from './settings.service';
import * as dataManagementService from './data-management.service';
import type { UpdateSettingsDto } from './settings.validation';

export async function handleGetPublicSettings(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const settings = await settingsService.getPublicSettings();
    res.status(200).json({ data: settings });
  } catch (error) {
    next(error);
  }
}

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

export async function handleResetData(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await dataManagementService.resetAllData();
    res.status(200).json({ data: { success: true } });
  } catch (error) {
    next(error);
  }
}

export async function handleDownloadBackup(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const backup = await dataManagementService.generateBackup();
    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="stationx-backup-${date}.json"`);
    res.status(200).json(backup);
  } catch (error) {
    next(error);
  }
}

export async function handleRestoreBackup(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const stats = await dataManagementService.restoreBackup(req.body.data);
    res.status(200).json({ data: { success: true, stats } });
  } catch (error) {
    next(error);
  }
}

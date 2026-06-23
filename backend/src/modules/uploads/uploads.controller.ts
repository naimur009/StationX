import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/authenticate';
import { createError } from '../../middleware/errorHandler';
import * as uploadService from './uploads.service';

export async function handleUploadImage(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file) {
      throw createError(400, 'VALIDATION_ERROR', 'No file provided. Please attach a file with field name "file".');
    }

    const folder = (req.body.folder as string) || 'uploads';
    const result = await uploadService.uploadImage(
      req.file.buffer,
      req.file.mimetype,
      req.file.size,
      folder
    );

    res.status(201).json({ data: result });
  } catch (error) {
    next(error);
  }
}

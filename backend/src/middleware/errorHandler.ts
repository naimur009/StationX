import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: Array<{ path: string; message: string }>;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = statusCode === 500 ? 'An unexpected error occurred' : err.message;

  if (statusCode === 500) {
    console.error('[errorHandler] Unhandled error: code=%s message="%s" path=%s', code, message, req.path);
  }

  const body: Record<string, unknown> = { code, message };

  if (err.details) {
    body.details = err.details;
  }

  res.status(statusCode).json({
    error: body,
  });
}

export function createError(
  statusCode: number,
  code: string,
  message: string,
  details?: Array<{ path: string; message: string }>
): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
}

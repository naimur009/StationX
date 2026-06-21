import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
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

  res.status(statusCode).json({
    error: {
      code,
      message,
    },
  });
}

export function createError(statusCode: number, code: string, message: string): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

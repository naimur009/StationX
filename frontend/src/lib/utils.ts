import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export class AppError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function createError(code: string, message: string): AppError {
  return new AppError(code, message);
}

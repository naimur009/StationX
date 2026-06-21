import { describe, it, expect } from 'vitest';
import { createError } from '../src/middleware/errorHandler';

describe('errorHandler', () => {
  it('creates an error with status code, code, and message', () => {
    const error = createError(401, 'UNAUTHORIZED', 'Invalid credentials');

    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.message).toBe('Invalid credentials');
    expect(error).toBeInstanceOf(Error);
  });

  it('defaults to 500 INTERNAL_ERROR when not specified', () => {
    const error = createError(500, 'INTERNAL_ERROR', 'Something went wrong');

    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('INTERNAL_ERROR');
  });
});

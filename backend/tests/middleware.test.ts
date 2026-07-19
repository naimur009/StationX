import { describe, it, expect, vi } from 'vitest';
import { authenticate } from '../src/middleware/authenticate';
import { optionalAuth } from '../src/middleware/optionalAuth';
import { authorize } from '../src/middleware/authorize';
import { validate } from '../src/middleware/validate';
import { signAccessToken } from '../src/lib/jwt';
import { z } from 'zod';

function mockReqResNext(headers: Record<string, string> = {}) {
  const req: any = { headers };
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const next = vi.fn();
  return { req, res, next };
}

describe('authenticate middleware', () => {
  it('returns 401 if no Authorization header', () => {
    const { req, res, next } = mockReqResNext({});
    authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 if Authorization header does not start with Bearer', () => {
    const { req, res, next } = mockReqResNext({ authorization: 'Basic abc123' });
    authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(401);
  });

  it('returns 401 if Bearer token is empty', () => {
    const { req, res, next } = mockReqResNext({ authorization: 'Bearer ' });
    authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(401);
  });

  it('returns 401 for garbage Bearer token', () => {
    const { req, res, next } = mockReqResNext({ authorization: 'Bearer garbage-token' });
    authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(401);
  });

  it('attaches user to req when token is valid', () => {
    const token = signAccessToken('user-1', 'employee', [
      { module: 'pos', actions: ['view'] },
    ]);
    const { req, res, next } = mockReqResNext({ authorization: `Bearer ${token}` });
    authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeUndefined();
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe('user-1');
    expect(req.user.role).toBe('employee');
    expect(req.user.permissions).toEqual([{ module: 'pos', actions: ['view'] }]);
  });
});

describe('authorize middleware', () => {
  it('returns 401 if no user on request', () => {
    const { req, res, next } = mockReqResNext();
    const middleware = authorize('pos', 'view');
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
  });

  it('allows admin to bypass permission checks', () => {
    const { req, res, next } = mockReqResNext();
    req.user = { id: '1', role: 'admin', permissions: [] };
    const middleware = authorize('pos', 'view');
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeUndefined();
  });

  it('returns 403 if module is not in permissions', () => {
    const { req, res, next } = mockReqResNext();
    req.user = { id: '1', role: 'employee', permissions: [] };
    const middleware = authorize('pos', 'view');
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
  });

  it('returns 403 if module is present but action is missing', () => {
    const { req, res, next } = mockReqResNext();
    req.user = {
      id: '1',
      role: 'employee',
      permissions: [{ module: 'pos', actions: ['view'] }],
    };
    const middleware = authorize('pos', 'delete');
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
  });

  it('allows access when module and action match', () => {
    const { req, res, next } = mockReqResNext();
    req.user = {
      id: '1',
      role: 'employee',
      permissions: [{ module: 'orders', actions: ['view', 'edit'] }],
    };
    const middleware = authorize('orders', 'edit');
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeUndefined();
  });
});

describe('optionalAuth middleware', () => {
  it('calls next without error when no Authorization header', () => {
    const { req, res, next } = mockReqResNext({});
    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeUndefined();
    expect(req.user).toBeUndefined();
  });

  it('calls next without error when header does not start with Bearer', () => {
    const { req, res, next } = mockReqResNext({ authorization: 'Basic abc123' });
    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeUndefined();
    expect(req.user).toBeUndefined();
  });

  it('calls next without error when Bearer token is empty', () => {
    const { req, res, next } = mockReqResNext({ authorization: 'Bearer ' });
    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeUndefined();
    expect(req.user).toBeUndefined();
  });

  it('calls next without error for garbage token (no throw)', () => {
    const { req, res, next } = mockReqResNext({ authorization: 'Bearer garbage-token' });
    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeUndefined();
    expect(req.user).toBeUndefined();
  });

  it('attaches user to req when token is valid', () => {
    const token = signAccessToken('user-1', 'employee', [
      { module: 'pos', actions: ['view'] },
    ]);
    const { req, res, next } = mockReqResNext({ authorization: `Bearer ${token}` });
    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeUndefined();
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe('user-1');
    expect(req.user.role).toBe('employee');
  });
});

describe('validate middleware', () => {
  it('calls next with parsed body when valid', () => {
    const schema = z.object({ email: z.string().email() });
    const middleware = validate(schema);

    const { req, res, next } = mockReqResNext();
    req.body = { email: 'test@example.com' };
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeUndefined();
    expect(req.body.email).toBe('test@example.com');
  });

  it('returns 400 VALIDATION_ERROR when body is invalid', () => {
    const schema = z.object({ email: z.string().email() });
    const middleware = validate(schema);

    const { req, res, next } = mockReqResNext();
    req.body = { email: 'not-an-email' };
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 with field-level details on validation failure', () => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    });
    const middleware = validate(schema);

    const { req, res, next } = mockReqResNext();
    req.body = { email: 'bad', password: '' };
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    const call = (res.json as any).mock.calls[0][0];
    expect(call.error.code).toBe('VALIDATION_ERROR');
    expect(call.error.details.length).toBeGreaterThanOrEqual(1);
    // Should have at least one field-level error
    expect(call.error.details[0].path).toBeDefined();
    expect(call.error.details[0].message).toBeDefined();
  });
});

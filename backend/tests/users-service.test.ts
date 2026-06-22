import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import User from '../src/models/User';
import * as userService from '../src/modules/users/users.service';

vi.mock('../src/models/User');
vi.mock('../src/models/ActivityLog');
vi.mock('bcrypt');

describe('userService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createUser', () => {
    it('rejects duplicate email', async () => {
      vi.mocked(User.findOne).mockResolvedValueOnce({ _id: 'existing' } as never);
      vi.mocked(bcrypt.hash).mockResolvedValueOnce('hash' as never);

      try {
        await userService.createUser(
          { name: 'Test', email: 'test@test.com', password: 'StrongPass1', role: 'manager', permissions: [] },
          'actor-id'
        );
        expect.unreachable('Expected error to be thrown');
      } catch (err: unknown) {
        const appErr = err as { code?: string; message?: string };
        expect(appErr.code).toBe('EMAIL_EXISTS');
        expect(appErr.message).toContain('already exists');
      }
    });

    it('creates user with hashed password', async () => {
      vi.mocked(User.findOne).mockResolvedValueOnce(null as never);
      vi.mocked(bcrypt.hash).mockResolvedValueOnce('hashed-password' as never);
      vi.mocked(User.create).mockResolvedValueOnce({
        _id: { toString: () => 'new-id' },
        name: 'Test',
        email: 'test@test.com',
        role: 'manager',
        permissions: [],
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const result = await userService.createUser(
        { name: 'Test', email: 'test@test.com', password: 'StrongPass1', role: 'manager', permissions: [] },
        'actor-id'
      );

      expect(bcrypt.hash).toHaveBeenCalledWith('StrongPass1', 12);
      expect(result).toHaveProperty('id', 'new-id');
      expect(result).toHaveProperty('email', 'test@test.com');
    });
  });

  describe('deactivateUser', () => {
    it('blocks self-deactivation', async () => {
      try {
        await userService.deactivateUser('self-id', 'self-id');
        expect.unreachable('Expected error to be thrown');
      } catch (err: unknown) {
        const appErr = err as { code?: string; message?: string };
        expect(appErr.code).toBe('CANNOT_DEACTIVATE_SELF');
      }
    });

    it('blocks deactivation of last admin', async () => {
      vi.mocked(User.findById).mockResolvedValueOnce({
        _id: { toString: () => 'admin-id' },
        role: 'admin',
        isActive: true,
        save: vi.fn(),
      } as never);
      vi.mocked(User.countDocuments).mockResolvedValueOnce(1 as never);

      try {
        await userService.deactivateUser('admin-id', 'other-id');
        expect.unreachable('Expected error to be thrown');
      } catch (err: unknown) {
        const appErr = err as { code?: string; message?: string };
        expect(appErr.code).toBe('LAST_ADMIN_PROTECTED');
      }
    });

    it('deactivates user when checks pass', async () => {
      const saveMock = vi.fn().mockResolvedValueOnce({
        _id: { toString: () => 'user-id' },
        name: 'Test',
        email: 'test@test.com',
        role: 'employee',
        permissions: [],
        isActive: false,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(User.findById).mockResolvedValueOnce({
        _id: { toString: () => 'user-id' },
        role: 'employee',
        isActive: true,
        save: saveMock,
      } as never);

      const result = await userService.deactivateUser('user-id', 'admin-id');

      expect(saveMock).toHaveBeenCalled();
      expect(result).toHaveProperty('isActive', false);
    });
  });

  describe('updatePermissions', () => {
    it('rejects invalid action for module', async () => {
      try {
        await userService.updatePermissions(
          'user-id',
          { permissions: [{ module: 'dashboard', actions: ['delete'] }] },
          'actor-id'
        );
        expect.unreachable('Expected error to be thrown');
      } catch (err: unknown) {
        const appErr = err as { code?: string; message?: string };
        expect(appErr.code).toBe('INVALID_ACTION');
      }
    });

    it('accepts valid permissions and deduplicates modules', async () => {
      vi.mocked(User.findByIdAndUpdate).mockResolvedValueOnce({
        _id: { toString: () => 'user-id' },
        name: 'Test',
        email: 'test@test.com',
        role: 'employee',
        permissions: [{ module: 'pos', actions: ['view', 'create'] }],
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const result = await userService.updatePermissions(
        'user-id',
        {
          permissions: [
            { module: 'pos', actions: ['view', 'create'] },
            { module: 'pos', actions: ['view'] },
          ],
        },
        'actor-id'
      );

      expect(result).toBeDefined();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import User from '../src/models/User';
import * as userService from '../src/modules/users/users.service';

vi.mock('../src/models/User');
vi.mock('../src/models/ActivityLog');
vi.mock('bcrypt');
vi.mock('../src/lib/transaction', () => ({
  withTransaction: vi.fn(async (fn) => {
    const mockSession = { id: 'mock-session' };
    return fn(mockSession);
  }),
}));

function mockQuery<T>(value: T) {
  return {
    then: (resolve: (v: T) => unknown) => Promise.resolve(value).then(resolve),
    catch: (reject: (err: unknown) => unknown) => Promise.resolve(value).catch(reject),
    finally: (cb: () => void) => Promise.resolve(value).finally(cb),
    lean: () => mockQuery(value),
    session: () => mockQuery(value),
  };
}

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
          { email: 'test@test.com', password: 'StrongPass1', role: 'employee', permissions: [] },
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
      vi.mocked(User.findById).mockResolvedValueOnce({
        _id: { toString: () => 'actor-id' },
        role: 'admin',
        permissions: [],
      } as never);
      vi.mocked(bcrypt.hash).mockResolvedValueOnce('hashed-password' as never);
      vi.mocked(User.create).mockResolvedValueOnce({
        _id: { toString: () => 'new-id' },
        name: 'Test',
        email: 'test@test.com',
        role: 'employee',
        permissions: [],
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const result = await userService.createUser(
        { email: 'test@test.com', password: 'StrongPass1', role: 'employee', permissions: [] },
        'actor-id'
      );

      expect(bcrypt.hash).toHaveBeenCalledWith('StrongPass1', 12);
      expect(result).toHaveProperty('id', 'new-id');
      expect(result).toHaveProperty('email', 'test@test.com');
    });
  });

  describe('deactivateUser (USR-E-01, USR-E-02)', () => {
    it('blocks self-deactivation — USR-E-01', async () => {
      try {
        await userService.deactivateUser('self-id', 'self-id');
        expect.unreachable('Expected error to be thrown');
      } catch (err: unknown) {
        const appErr = err as { code?: string; message?: string };
        expect(appErr.code).toBe('CANNOT_DEACTIVATE_SELF');
      }
    });

    it('blocks non-admin from deactivating an admin account', async () => {
      vi.mocked(User.findById)
        .mockResolvedValueOnce({ _id: 'actor-id', role: 'employee' } as never)
        .mockReturnValueOnce({ select: vi.fn().mockResolvedValue({ role: 'admin' }) } as never);

      try {
        await userService.deactivateUser('admin-id', 'actor-id');
        expect.unreachable('Expected error to be thrown');
      } catch (err: unknown) {
        const appErr = err as { code?: string; message?: string };
        expect(appErr.code).toBe('FORBIDDEN');
        expect(appErr.message).toContain('admin');
      }
    });

    it('blocks deactivation of last admin — USR-E-02', async () => {
      vi.mocked(User.findById)
        .mockResolvedValueOnce({ _id: 'admin-actor', role: 'admin' } as never)
        .mockReturnValueOnce({ select: vi.fn().mockResolvedValue({ role: 'admin' }) } as never)
        .mockReturnValueOnce({
          session: vi.fn().mockResolvedValue({
            _id: { toString: () => 'admin-id' },
            role: 'admin',
            isActive: true,
            save: vi.fn(),
          }),
        } as never);
      vi.mocked(User.countDocuments).mockReturnValueOnce(mockQuery(0 as never));

      try {
        await userService.deactivateUser('admin-id', 'admin-actor');
        expect.unreachable('Expected error to be thrown');
      } catch (err: unknown) {
        const appErr = err as { code?: string; message?: string };
        expect(appErr.code).toBe('LAST_ADMIN_PROTECTED');
      }
    });

    it('allows deactivating one of two admins (USR-E-02 happy path)', async () => {
      const saveMock = vi.fn().mockResolvedValueOnce({} as never);
      vi.mocked(User.findById)
        .mockResolvedValueOnce({ _id: 'admin-actor', role: 'admin' } as never)
        .mockReturnValueOnce({ select: vi.fn().mockResolvedValue({ role: 'admin' }) } as never)
        .mockReturnValueOnce({
          session: vi.fn().mockResolvedValue({
            _id: { toString: () => 'admin-id' },
            role: 'admin',
            isActive: true,
            save: saveMock,
          }),
        } as never);
      vi.mocked(User.countDocuments).mockReturnValueOnce(mockQuery(1 as never));

      const result = await userService.deactivateUser('admin-id', 'admin-actor');
      expect(saveMock).toHaveBeenCalled();
      expect(result).toHaveProperty('isActive', false);
    });

    it('deactivates employee user when checks pass', async () => {
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

      vi.mocked(User.findById)
        .mockResolvedValueOnce({ _id: 'admin-id', role: 'admin' } as never)
        .mockReturnValueOnce({ select: vi.fn().mockResolvedValue({ role: 'employee' }) } as never)
        .mockReturnValueOnce({
          session: vi.fn().mockResolvedValue({
            _id: { toString: () => 'user-id' },
            role: 'employee',
            isActive: true,
            save: saveMock,
          }),
        } as never);

      const result = await userService.deactivateUser('user-id', 'admin-id');
      expect(saveMock).toHaveBeenCalled();
      expect(result).toHaveProperty('isActive', false);
    });
  });

  describe('updatePermissions (USR-H-05, permission elevation)', () => {
    it('rejects invalid action for module', async () => {
      vi.mocked(User.findById).mockResolvedValueOnce({
        _id: { toString: () => 'admin-id' },
        role: 'admin',
      } as never);

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

    it('blocks non-admin from granting permissions they lack', async () => {
      vi.mocked(User.findById).mockResolvedValueOnce({
        _id: { toString: () => 'actor-id' },
        role: 'employee',
        permissions: [{ module: 'pos', actions: ['view'] }],
      } as never);

      try {
        await userService.updatePermissions(
          'target-id',
          {
            permissions: [
              { module: 'settings', actions: ['edit'] },
            ],
          },
          'actor-id'
        );
        expect.unreachable('Expected error to be thrown');
      } catch (err: unknown) {
        const appErr = err as { code?: string; message?: string };
        expect(appErr.code).toBe('FORBIDDEN');
        expect(appErr.message).toContain('settings');
      }
    });

    it('blocks non-admin from granting actions they lack', async () => {
      vi.mocked(User.findById).mockResolvedValueOnce({
        _id: { toString: () => 'actor-id' },
        role: 'employee',
        permissions: [{ module: 'pos', actions: ['view'] }],
      } as never);

      try {
        await userService.updatePermissions(
          'target-id',
          {
            permissions: [
              { module: 'pos', actions: ['view', 'create'] },
            ],
          },
          'actor-id'
        );
        expect.unreachable('Expected error to be thrown');
      } catch (err: unknown) {
        const appErr = err as { code?: string; message?: string };
        expect(appErr.code).toBe('FORBIDDEN');
        expect(appErr.message).toContain('create');
      }
    });

    it('allows admin to grant any permissions', async () => {
      vi.mocked(User.findById).mockResolvedValueOnce({
        _id: { toString: () => 'admin-id' },
        role: 'admin',
        permissions: [],
      } as never);
      vi.mocked(User.findByIdAndUpdate).mockResolvedValueOnce({
        _id: { toString: () => 'target-id' },
        name: 'Target',
        email: 't@t.com',
        role: 'employee',
        permissions: [{ module: 'settings', actions: ['edit'] }],
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const result = await userService.updatePermissions(
        'target-id',
        { permissions: [{ module: 'settings', actions: ['edit'] }] },
        'admin-id',
        'admin'
      );

      expect(result).toBeDefined();
      expect(result.permissions).toEqual([{ module: 'settings', actions: ['edit'] }]);
    });

    it('allows non-admin to grant permissions they possess (same module+actions)', async () => {
      vi.mocked(User.findById).mockResolvedValueOnce({
        _id: { toString: () => 'actor-id' },
        role: 'employee',
        permissions: [{ module: 'pos', actions: ['view', 'create'] }],
      } as never);
      vi.mocked(User.findByIdAndUpdate).mockResolvedValueOnce({
        _id: { toString: () => 'target-id' },
        name: 'Target',
        email: 't@t.com',
        role: 'employee',
        permissions: [{ module: 'pos', actions: ['view', 'create'] }],
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const result = await userService.updatePermissions(
        'target-id',
        { permissions: [{ module: 'pos', actions: ['view', 'create'] }] },
        'actor-id',
        'admin'
      );

      expect(result).toBeDefined();
    });

    it('deduplicates modules when same module appears twice', async () => {
      vi.mocked(User.findById).mockResolvedValueOnce({
        _id: { toString: () => 'actor-id' },
        role: 'employee',
        permissions: [{ module: 'pos', actions: ['view', 'create'] }],
      } as never);
      vi.mocked(User.findByIdAndUpdate).mockResolvedValueOnce({
        _id: { toString: () => 'target-id' },
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
        'target-id',
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

  describe('changeUserPassword', () => {
    it('rejects when current password is incorrect', async () => {
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never);
      vi.mocked(User.findById).mockReturnValueOnce({
        select: vi.fn().mockResolvedValueOnce({
          _id: 'user-id',
          passwordHash: 'stored-hash',
        }),
      } as never);

      try {
        await userService.changeUserPassword('user-id', { prevPassword: 'wrong', newPassword: 'NewPass123' }, 'user-id');
        expect.unreachable('Expected error to be thrown');
      } catch (err: unknown) {
        const appErr = err as { code?: string; message?: string };
        expect(appErr.code).toBe('INVALID_PASSWORD');
      }
    });

    it('rejects when actor is not the target user', async () => {
      try {
        await userService.changeUserPassword('target-id', { prevPassword: 'x', newPassword: 'NewPass123' }, 'other-id');
        expect.unreachable('Expected error to be thrown');
      } catch (err: unknown) {
        const appErr = err as { code?: string; message?: string };
        expect(appErr.code).toBe('FORBIDDEN');
      }
    });

    it('updates password when current password is correct', async () => {
      const saveMock = vi.fn().mockResolvedValueOnce({} as never);
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
      vi.mocked(bcrypt.hash).mockResolvedValueOnce('new-hash' as never);
      vi.mocked(User.findById).mockReturnValueOnce({
        select: vi.fn().mockResolvedValueOnce({
          _id: 'user-id',
          passwordHash: 'stored-hash',
          save: saveMock,
        }),
      } as never);

      const result = await userService.changeUserPassword('user-id', { prevPassword: 'correct', newPassword: 'NewPass123' }, 'user-id');

      expect(bcrypt.hash).toHaveBeenCalledWith('NewPass123', 12);
      expect(saveMock).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });

  describe('updateUser (USR-S-01)', () => {
    it('updates name, email, role but never permissions or password', async () => {
      vi.mocked(User.findOne).mockResolvedValueOnce(null as never);
      vi.mocked(User.findByIdAndUpdate).mockResolvedValueOnce({
        _id: { toString: () => 'user-id' },
        name: 'New Name',
        email: 'new@test.com',
        role: 'admin',
        permissions: [{ module: 'pos', actions: ['view'] }],
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const result = await userService.updateUser(
        'user-id',
        {
          name: 'New Name',
          email: 'new@test.com',
          role: 'admin',
        },
        'actor-id',
        'admin'
      );

      expect(result.name).toBe('New Name');
      expect(result.email).toBe('new@test.com');
      expect(result.role).toBe('admin');
      // The $set should only contain name, email, role — not permissions or password
      const updateCall = vi.mocked(User.findByIdAndUpdate).mock.calls[0];
      const $set = (updateCall[1] as { $set: Record<string, unknown> }).$set;
      expect($set).not.toHaveProperty('permissions');
      expect($set).not.toHaveProperty('password');
      expect($set).not.toHaveProperty('passwordHash');
    });
  });

  describe('permanentDeleteUser', () => {
    it('blocks self-deletion', async () => {
      try {
        await userService.permanentDeleteUser('self-id', 'self-id');
        expect.unreachable('Expected error to be thrown');
      } catch (err: unknown) {
        const appErr = err as { code?: string; message?: string };
        expect(appErr.code).toBe('CANNOT_DELETE_SELF');
      }
    });

    it('blocks non-admin from permanently deleting an admin account', async () => {
      vi.mocked(User.findById)
        .mockResolvedValueOnce({ _id: 'actor-id', role: 'employee' } as never)
        .mockReturnValueOnce({ select: vi.fn().mockResolvedValue({ role: 'admin' }) } as never);

      try {
        await userService.permanentDeleteUser('admin-id', 'actor-id');
        expect.unreachable('Expected error to be thrown');
      } catch (err: unknown) {
        const appErr = err as { code?: string; message?: string };
        expect(appErr.code).toBe('FORBIDDEN');
      }
    });

    it('blocks permanent deletion of last admin', async () => {
      vi.mocked(User.findById)
        .mockResolvedValueOnce({ _id: 'admin-actor', role: 'admin' } as never)
        .mockReturnValueOnce({ select: vi.fn().mockResolvedValue({ role: 'admin' }) } as never)
        .mockReturnValueOnce(mockQuery({
          _id: { toString: () => 'admin-id' },
          role: 'admin',
          isActive: true,
        }));
      vi.mocked(User.countDocuments).mockReturnValueOnce(mockQuery(0 as never));

      try {
        await userService.permanentDeleteUser('admin-id', 'admin-actor');
        expect.unreachable('Expected error to be thrown');
      } catch (err: unknown) {
        const appErr = err as { code?: string; message?: string };
        expect(appErr.code).toBe('LAST_ADMIN_PROTECTED');
      }
    });
  });

  describe('adminResetUserPassword', () => {
    it('blocks admin resetting own password', async () => {
      try {
        await userService.adminResetUserPassword('self-id', { newPassword: 'NewPass123' }, 'self-id');
        expect.unreachable('Expected error to be thrown');
      } catch (err: unknown) {
        const appErr = err as { code?: string; message?: string };
        expect(appErr.code).toBe('CANNOT_RESET_SELF');
      }
    });

    it('blocks non-admin from resetting an admin password', async () => {
      vi.mocked(User.findById)
        .mockResolvedValueOnce({ _id: 'actor-id', role: 'employee' } as never)
        .mockResolvedValueOnce({ _id: 'admin-id', role: 'admin' } as never);

      try {
        await userService.adminResetUserPassword('admin-id', { newPassword: 'NewPass123' }, 'actor-id');
        expect.unreachable('Expected error to be thrown');
      } catch (err: unknown) {
        const appErr = err as { code?: string; message?: string };
        expect(appErr.code).toBe('FORBIDDEN');
        expect(appErr.message).toContain('admin');
      }
    });

    it('allows non-admin to reset an employee password', async () => {
      const saveMock = vi.fn().mockResolvedValueOnce({} as never);
      vi.mocked(User.findById)
        .mockResolvedValueOnce({ _id: 'actor-id', role: 'employee' } as never)
        .mockResolvedValueOnce({ _id: 'emp-id', role: 'employee', save: saveMock } as never);
      vi.mocked(bcrypt.hash).mockResolvedValueOnce('new-hash' as never);

      const result = await userService.adminResetUserPassword('emp-id', { newPassword: 'NewPass123' }, 'actor-id');
      expect(bcrypt.hash).toHaveBeenCalledWith('NewPass123', 12);
      expect(saveMock).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('allows admin to reset another admin password', async () => {
      const saveMock = vi.fn().mockResolvedValueOnce({} as never);
      vi.mocked(User.findById)
        .mockResolvedValueOnce({ _id: 'admin-actor', role: 'admin' } as never)
        .mockResolvedValueOnce({ _id: 'admin-id', role: 'admin', save: saveMock } as never);
      vi.mocked(bcrypt.hash).mockResolvedValueOnce('new-hash' as never);

      const result = await userService.adminResetUserPassword('admin-id', { newPassword: 'NewPass123' }, 'admin-actor');
      expect(saveMock).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });
});

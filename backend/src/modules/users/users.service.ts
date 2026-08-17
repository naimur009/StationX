import bcrypt from 'bcrypt';
import User, { IUser } from '../../models/User';
import { createError } from '../../middleware/errorHandler';
import { MODULE_ACTIONS } from '../../shared/constants';
import { expandPermissions } from '../../shared/permission-dependencies';
import { withTransaction } from '../../lib/transaction';
import type {
  CreateUserDto,
  UpdateUserDto,
  ListUsersDto,
  UpdatePermissionsDto,
  ChangePasswordDto,
  AdminResetPasswordDto,
} from './users.validation';

const escapeRegex = (str: string): string =>
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SALT_ROUNDS = 12;

interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: { module: string; actions: string[] }[];
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function toUserResponse(user: Pick<IUser, '_id' | 'name' | 'email' | 'role' | 'permissions' | 'isActive' | 'lastLoginAt' | 'createdAt' | 'updatedAt'>, viewerRole?: string): UserResponse {
  return {
    id: user._id.toString(),
    name: user.name ?? '',
    email: user.email,
    role: user.role,
    permissions: viewerRole ? user.permissions : [],
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function listUsers(query: ListUsersDto, viewerRole?: string) {
  const filter: Record<string, unknown> = {};

  if (query.includeInactive === 'true') {
    // no isActive filter — show all
  } else if (query.includeInactive === 'false') {
    filter.isActive = true;
  } else {
    filter.isActive = true;
  }

  if (query.role) {
    filter.role = query.role;
  }
  if (query.search) {
    const safe = escapeRegex(query.search);
    filter.$or = [
      { name: { $regex: safe, $options: 'i' } },
      { email: { $regex: safe, $options: 'i' } },
    ];
  }

  const skip = (query.page - 1) * query.limit;

  const users = await User.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(query.limit)
    .lean();
  const total = await User.countDocuments(filter);

  return {
    data: users.map((u) => toUserResponse(u, viewerRole)),
    meta: { total, page: query.page, limit: query.limit },
  };
}

function deduplicatePermissions(permissions: { module: string; actions: string[] }[]): { module: string; actions: string[] }[] {
  const seen = new Set<string>();
  const deduped: { module: string; actions: string[] }[] = [];
  for (const p of permissions) {
    if (seen.has(p.module)) {
      const existing = deduped.find((e) => e.module === p.module);
      if (existing) {
        existing.actions = p.actions;
      }
    } else {
      seen.add(p.module);
      deduped.push({ module: p.module, actions: [...new Set(p.actions)] });
    }
  }
  return deduped;
}

export async function createUser(dto: CreateUserDto, actorId: string, viewerRole?: string) {
  const existing = await User.findOne({ email: dto.email });
  if (existing) {
    throw createError(409, 'EMAIL_EXISTS', 'A user with this email already exists');
  }

  const actor = await User.findById(actorId);
  if (!actor) {
    throw createError(404, 'NOT_FOUND', 'Actor user not found');
  }

  if (actor.role !== 'admin') {
    if (dto.role === 'admin') {
      throw createError(403, 'FORBIDDEN', 'Only admins can create admin accounts');
    }
    for (const p of dto.permissions) {
      const actorPerm = (actor.permissions ?? []).find((a) => a.module === p.module);
      if (!actorPerm) {
        throw createError(403, 'FORBIDDEN', `You cannot assign permissions for module "${p.module}" because you lack it yourself`);
      }
      const missing = p.actions.filter((a) => !actorPerm.actions.includes(a));
      if (missing.length > 0) {
        throw createError(403, 'FORBIDDEN', `You cannot assign action(s) "${missing.join(', ')}" for module "${p.module}" because you lack them yourself`);
      }
    }
  }

  const deduped = deduplicatePermissions(dto.permissions);
  const expanded = expandPermissions(deduped);
  const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

  let user: IUser;
  try {
    user = await User.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: dto.role,
      permissions: expanded,
      isActive: true,
    });
  } catch (error: unknown) {
    const mongoErr = error as { code?: number };
    if (mongoErr.code === 11000) {
      throw createError(409, 'EMAIL_EXISTS', 'A user with this email already exists');
    }
    throw error;
  }

  return toUserResponse(user, viewerRole);
}

export async function getUserById(id: string, viewerRole?: string) {
  const user = await User.findById(id).lean();

  if (!user) {
    throw createError(404, 'NOT_FOUND', 'User not found');
  }

  return toUserResponse(user, viewerRole);
}

export async function updateUser(id: string, dto: UpdateUserDto, actorId: string, viewerRole?: string) {
  if (dto.email) {
    const existing = await User.findOne({ email: dto.email, _id: { $ne: id } });
    if (existing) {
      throw createError(409, 'EMAIL_EXISTS', 'A user with this email already exists');
    }
  }

  if (dto.role !== undefined && viewerRole !== 'admin') {
    throw createError(403, 'FORBIDDEN', 'Only admins can change user roles');
  }

  const updates: Record<string, unknown> = {};
  if (dto.name !== undefined) updates.name = dto.name;
  if (dto.email !== undefined) updates.email = dto.email;
  if (dto.role !== undefined) updates.role = dto.role;

  let user: IUser | null;
  try {
    user = await User.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });
  } catch (error: unknown) {
    const mongoErr = error as { code?: number };
    if (mongoErr.code === 11000) {
      throw createError(409, 'EMAIL_EXISTS', 'A user with this email already exists');
    }
    throw error;
  }

  if (!user) {
    throw createError(404, 'NOT_FOUND', 'User not found');
  }

  return toUserResponse(user, viewerRole);
}

export async function deactivateUser(id: string, actorId: string, viewerRole?: string) {
  if (id === actorId) {
    throw createError(409, 'CANNOT_DEACTIVATE_SELF', 'You cannot deactivate your own account');
  }

  const actor = await User.findById(actorId);
  if (!actor) {
    throw createError(404, 'NOT_FOUND', 'Actor user not found');
  }

  const target = await User.findById(id).select('role');
  if (!target) {
    throw createError(404, 'NOT_FOUND', 'User not found');
  }

  if (target.role === 'admin' && actor.role !== 'admin') {
    throw createError(403, 'FORBIDDEN', 'Only admins can deactivate another admin account');
  }

  return withTransaction(async (session) => {
    const user = await User.findById(id).session(session);

    if (!user) {
      throw createError(404, 'NOT_FOUND', 'User not found');
    }

    if (!user.isActive) {
      throw createError(400, 'ALREADY_INACTIVE', 'This user is already deactivated');
    }

    if (user.role === 'admin') {
      const otherActiveAdmins = await User.countDocuments({
        _id: { $ne: id },
        role: 'admin',
        isActive: true,
      }).session(session);
      if (otherActiveAdmins < 1) {
        throw createError(
          409,
          'LAST_ADMIN_PROTECTED',
          'Cannot deactivate the last active admin account'
        );
      }
    }

    user.isActive = false;
    await user.save({ session });

    return toUserResponse(user, viewerRole);
  });
}

export async function reactivateUser(id: string, actorId: string, viewerRole?: string) {
  const actor = await User.findById(actorId);
  if (!actor) {
    throw createError(404, 'NOT_FOUND', 'Actor user not found');
  }

  const user = await User.findById(id);

  if (!user) {
    throw createError(404, 'NOT_FOUND', 'User not found');
  }

  if (user.role === 'admin' && actor.role !== 'admin') {
    throw createError(403, 'FORBIDDEN', 'Only admins can reactivate another admin account');
  }

  if (user.isActive) {
    throw createError(400, 'ALREADY_ACTIVE', 'This user is already active');
  }

  user.isActive = true;
  await user.save();

  return toUserResponse(user, viewerRole);
}

export async function updatePermissions(id: string, dto: UpdatePermissionsDto, actorId: string, viewerRole?: string) {
  const actor = await User.findById(actorId);
  if (!actor) {
    throw createError(404, 'NOT_FOUND', 'Actor user not found');
  }

  if (actor.role !== 'admin') {
    for (const p of dto.permissions) {
      const actorPerm = (actor.permissions ?? []).find((a) => a.module === p.module);
      if (!actorPerm) {
        throw createError(403, 'FORBIDDEN', `You cannot assign permissions for module "${p.module}" because you lack it yourself`);
      }
      const missing = p.actions.filter((a) => !actorPerm.actions.includes(a));
      if (missing.length > 0) {
        throw createError(403, 'FORBIDDEN', `You cannot assign action(s) "${missing.join(', ')}" for module "${p.module}" because you lack them yourself`);
      }
    }
  }

  for (const p of dto.permissions) {
    const validActions = MODULE_ACTIONS[p.module];
    if (!validActions) {
      throw createError(
        400,
        'INVALID_MODULE',
        `Unknown module "${p.module}" in permissions`
      );
    }
    const invalid = p.actions.filter((a) => !(validActions as readonly string[]).includes(a));
    if (invalid.length > 0) {
      throw createError(
        400,
        'INVALID_ACTION',
        `Invalid action(s) for module "${p.module}": ${invalid.join(', ')}`
      );
    }
  }

  const deduped = deduplicatePermissions(dto.permissions);
  const expanded = expandPermissions(deduped);

  const user = await User.findByIdAndUpdate(
    id,
    { $set: { permissions: expanded } },
    { new: true, runValidators: true }
  );

  if (!user) {
    throw createError(404, 'NOT_FOUND', 'User not found');
  }

  return toUserResponse(user, viewerRole);
}

export async function permanentDeleteUser(id: string, actorId: string) {
  if (id === actorId) {
    throw createError(409, 'CANNOT_DELETE_SELF', 'You cannot delete your own account');
  }

  const actor = await User.findById(actorId);
  if (!actor) {
    throw createError(404, 'NOT_FOUND', 'Actor user not found');
  }

  const target = await User.findById(id).select('role');
  if (!target) {
    throw createError(404, 'NOT_FOUND', 'User not found');
  }

  if (target.role === 'admin' && actor.role !== 'admin') {
    throw createError(403, 'FORBIDDEN', 'Only admins can permanently delete another admin account');
  }

  return withTransaction(async (session) => {
    const user = await User.findById(id).session(session);
    if (!user) {
      throw createError(404, 'NOT_FOUND', 'User not found');
    }

    if (user.role === 'admin') {
      const otherActiveAdmins = await User.countDocuments({
        _id: { $ne: id },
        role: 'admin',
        isActive: true,
      }).session(session);
      if (otherActiveAdmins < 1) {
        throw createError(
          409,
          'LAST_ADMIN_PROTECTED',
          'Cannot permanently delete the last admin account'
        );
      }
    }

    await User.findByIdAndDelete(id).session(session);

    return { success: true };
  });
}

export async function changeUserPassword(
  id: string,
  dto: ChangePasswordDto,
  actorId: string
): Promise<{ success: boolean }> {
  if (id !== actorId) {
    throw createError(403, 'FORBIDDEN', 'You can only change your own password');
  }


  const user = await User.findById(id).select('+passwordHash');

  if (!user) {
    throw createError(404, 'NOT_FOUND', 'User not found');
  }

  const isValid = await bcrypt.compare(dto.prevPassword, user.passwordHash);
  if (!isValid) {
    throw createError(400, 'INVALID_PASSWORD', 'Current password is incorrect');
  }

  const newHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
  user.passwordHash = newHash;
  await user.save();

  return { success: true };
}

export async function adminResetUserPassword(
  id: string,
  dto: AdminResetPasswordDto,
  actorId: string
): Promise<{ success: boolean }> {
  if (id === actorId) {
    throw createError(400, 'CANNOT_RESET_SELF', 'Use the self-service password change endpoint for your own account');
  }

  const [actor, user] = await Promise.all([
    User.findById(actorId),
    User.findById(id),
  ]);

  if (!actor) {
    throw createError(404, 'NOT_FOUND', 'Actor user not found');
  }

  if (!user) {
    throw createError(404, 'NOT_FOUND', 'User not found');
  }

  if (user.role === 'admin' && actor.role !== 'admin') {
    throw createError(403, 'FORBIDDEN', 'Only admins can reset the password of another admin account');
  }

  const newHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
  user.passwordHash = newHash;
  await user.save();

  return { success: true };
}

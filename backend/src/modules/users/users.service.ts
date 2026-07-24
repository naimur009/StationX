import bcrypt from 'bcrypt';
import User, { IUser } from '../../models/User';
import Employee from '../../models/Employee';
import { createError } from '../../middleware/errorHandler';
import { MODULE_ACTIONS } from '../../shared/constants';
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

function toUserResponse(user: IUser): UserResponse {
  return {
    id: user._id.toString(),
    name: user.name ?? '',
    email: user.email,
    role: user.role,
    permissions: user.permissions,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function listUsers(query: ListUsersDto) {
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

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).lean(),
    User.countDocuments(filter),
  ]);

  return {
    data: (users as unknown as IUser[]).map(toUserResponse),
    meta: { total, page: query.page, limit: query.limit },
  };
}

export async function createUser(dto: CreateUserDto, actorId: string) {
  const existing = await User.findOne({ email: dto.email });
  if (existing) {
    throw createError(409, 'EMAIL_EXISTS', 'A user with this email already exists');
  }

  const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

  const user = await User.create({
    name: dto.name,
    email: dto.email,
    passwordHash,
    role: dto.role,
    permissions: dto.permissions,
    isActive: true,
  });

  if (dto.role === 'employee' && dto.name) {
    try {
      const empExists = await Employee.findOne({ name: dto.name });
      if (!empExists) {
        await Employee.create({ name: dto.name, phone: 'N/A', address: '', baseSalary: 0 });
      }
    } catch (err) {
      console.error('[createUser] Failed to sync employee record:', err);
    }
  }

  return toUserResponse(user);
}

export async function getUserById(id: string) {
  const user = await User.findById(id).lean();

  if (!user) {
    throw createError(404, 'NOT_FOUND', 'User not found');
  }

  return toUserResponse(user as unknown as IUser);
}

export async function updateUser(id: string, dto: UpdateUserDto, actorId: string) {
  if (dto.email) {
    const existing = await User.findOne({ email: dto.email, _id: { $ne: id } });
    if (existing) {
      throw createError(409, 'EMAIL_EXISTS', 'A user with this email already exists');
    }
  }

  const updates: Record<string, unknown> = {};
  if (dto.name !== undefined) updates.name = dto.name;
  if (dto.email !== undefined) updates.email = dto.email;
  if (dto.role !== undefined) updates.role = dto.role;


  const user = await User.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });

  if (!user) {
    throw createError(404, 'NOT_FOUND', 'User not found');
  }

  return toUserResponse(user);
}

export async function deactivateUser(id: string, actorId: string) {
  if (id === actorId) {
    throw createError(409, 'CANNOT_DEACTIVATE_SELF', 'You cannot deactivate your own account');
  }

  const user = await User.findById(id);

  if (!user) {
    throw createError(404, 'NOT_FOUND', 'User not found');
  }

  if (!user.isActive) {
    throw createError(400, 'ALREADY_INACTIVE', 'This user is already deactivated');
  }

  if (user.role === 'admin') {
    const activeAdminCount = await User.countDocuments({ role: 'admin', isActive: true });
    if (activeAdminCount <= 1) {
      throw createError(
        409,
        'LAST_ADMIN_PROTECTED',
        'Cannot deactivate the last active admin account'
      );
    }
  }

  user.isActive = false;
  await user.save();

  return toUserResponse(user);
}

export async function reactivateUser(id: string, actorId: string) {
  const user = await User.findById(id);

  if (!user) {
    throw createError(404, 'NOT_FOUND', 'User not found');
  }

  if (user.isActive) {
    throw createError(400, 'ALREADY_ACTIVE', 'This user is already active');
  }

  user.isActive = true;
  await user.save();

  return toUserResponse(user);
}

export async function updatePermissions(id: string, dto: UpdatePermissionsDto, actorId: string) {
  const validEntries: { module: string; actions: string[] }[] = [];

  for (const p of dto.permissions) {
    const validActions = MODULE_ACTIONS[p.module];
    if (!validActions) {
      console.warn(`[updatePermissions] Skipping unknown module "${p.module}" for user "${id}"`);
      continue;
    }
    const invalid = p.actions.filter((a) => !(validActions as readonly string[]).includes(a));
    if (invalid.length > 0) {
      throw createError(
        400,
        'INVALID_ACTION',
        `Invalid action(s) for module "${p.module}": ${invalid.join(', ')}`
      );
    }
    validEntries.push({ module: p.module, actions: [...new Set(p.actions)] });
  }

  const seen = new Set<string>();
  const deduped: { module: string; actions: string[] }[] = [];
  for (const p of validEntries) {
    if (seen.has(p.module)) {
      const existing = deduped.find((e) => e.module === p.module);
      if (existing) {
        existing.actions = p.actions;
      }
    } else {
      seen.add(p.module);
      deduped.push(p);
    }
  }

  const user = await User.findByIdAndUpdate(
    id,
    { $set: { permissions: deduped } },
    { new: true, runValidators: true }
  );

  if (!user) {
    throw createError(404, 'NOT_FOUND', 'User not found');
  }

  return toUserResponse(user);
}

export async function permanentDeleteUser(id: string, actorId: string) {
  if (id === actorId) {
    throw createError(409, 'CANNOT_DELETE_SELF', 'You cannot delete your own account');
  }

  const user = await User.findById(id);

  if (!user) {
    throw createError(404, 'NOT_FOUND', 'User not found');
  }

  if (user.role === 'admin') {
    const activeAdminCount = await User.countDocuments({ role: 'admin', isActive: true });
    if (activeAdminCount <= 1) {
      throw createError(
        409,
        'LAST_ADMIN_PROTECTED',
        'Cannot permanently delete the last admin account'
      );
    }
  }

  await User.findByIdAndDelete(id);

  return { success: true };
}

export async function changeUserPassword(
  id: string,
  dto: ChangePasswordDto
): Promise<{ success: boolean }> {
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
  dto: AdminResetPasswordDto
): Promise<{ success: boolean }> {
  const user = await User.findById(id);

  if (!user) {
    throw createError(404, 'NOT_FOUND', 'User not found');
  }

  const newHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
  user.passwordHash = newHash;
  await user.save();

  return { success: true };
}

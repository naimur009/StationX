import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/authenticate';
import * as userService from './users.service';
import type { CreateUserDto, UpdateUserDto, ListUsersDto, UpdatePermissionsDto, ChangePasswordDto } from './users.validation';

export async function handleListUsers(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as ListUsersDto;
    const result = await userService.listUsers(query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleCreateUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: CreateUserDto = req.body;
    const user = await userService.createUser(dto, req.user!.id);
    res.status(201).json({ data: user });
  } catch (error) {
    next(error);
  }
}

export async function handleGetUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await userService.getUserById(req.params.id);
    res.status(200).json({ data: user });
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: UpdateUserDto = req.body;
    const user = await userService.updateUser(req.params.id, dto, req.user!.id);
    const changes = Object.keys(dto);
    if (changes.length > 0) {
      res.locals.activityMetadata = { changes };
    }
    res.status(200).json({ data: user });
  } catch (error) {
    next(error);
  }
}

export async function handleDeactivateUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await userService.deactivateUser(req.params.id, req.user!.id);
    res.status(200).json({ data: user });
  } catch (error) {
    next(error);
  }
}

export async function handleReactivateUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await userService.reactivateUser(req.params.id, req.user!.id);
    res.status(200).json({ data: user });
  } catch (error) {
    next(error);
  }
}

export async function handlePermanentDeleteUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await userService.permanentDeleteUser(req.params.id, req.user!.id);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function handleUpdatePermissions(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: UpdatePermissionsDto = req.body;
    const user = await userService.updatePermissions(req.params.id, dto, req.user!.id);
    res.status(200).json({ data: user });
  } catch (error) {
    next(error);
  }
}

export async function handleChangePassword(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: ChangePasswordDto = req.body;
    const result = await userService.changeUserPassword(req.params.id, dto);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

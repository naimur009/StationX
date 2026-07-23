import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/authenticate';
import * as tableService from './tables.service';
import type { CreateTableDto, UpdateTableDto, UpdateTableStatusDto, ListTablesDto } from './tables.validation';

export async function handleListTables(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as ListTablesDto;
    const result = await tableService.listTables(query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleGetTable(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await tableService.getTableById(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleCreateTable(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: CreateTableDto = req.body;
    const result = await tableService.createTable(dto);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateTable(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: UpdateTableDto = req.body;
    const result = await tableService.updateTable(req.params.id, dto);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateTableStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: UpdateTableStatusDto = req.body;
    const result = await tableService.updateTableStatus(req.params.id, dto);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleDeleteTable(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await tableService.deleteTable(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

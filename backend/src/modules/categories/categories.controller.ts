import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/authenticate';
import * as categoryService from './categories.service';
import type {
  CreateCategoryDto,
  UpdateCategoryDto,
  ListCategoriesDto,
} from './categories.validation';

export async function handleListCategories(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as ListCategoriesDto;
    const result = await categoryService.listCategories(query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleGetCategory(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const category = await categoryService.getCategoryById(req.params.id);
    res.status(200).json({ data: category });
  } catch (error) {
    next(error);
  }
}

export async function handleCreateCategory(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: CreateCategoryDto = req.body;
    const category = await categoryService.createCategory(dto);
    res.status(201).json({ data: category });
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateCategory(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: UpdateCategoryDto = req.body;
    const category = await categoryService.updateCategory(req.params.id, dto);
    res.status(200).json({ data: category });
  } catch (error) {
    next(error);
  }
}

export async function handleDeleteCategory(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await categoryService.deleteCategory(req.params.id);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function handlePermanentDeleteCategory(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await categoryService.permanentDeleteCategory(req.params.id);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/authenticate';
import * as productService from './products.service';
import type {
  CreateProductDto,
  UpdateProductDto,
  ListProductsDto,
} from './products.validation';

export async function handleListProducts(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as ListProductsDto;
    const result = await productService.listProducts(query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleGetProduct(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const product = await productService.getProductById(req.params.id);
    res.status(200).json({ data: product });
  } catch (error) {
    next(error);
  }
}

export async function handleCreateProduct(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: CreateProductDto = req.body;
    const product = await productService.createProduct(dto);
    res.status(201).json({ data: product });
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateProduct(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: UpdateProductDto = req.body;
    const product = await productService.updateProduct(req.params.id, dto);
    res.status(200).json({ data: product });
  } catch (error) {
    next(error);
  }
}

export async function handleDeleteProduct(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await productService.deleteProduct(req.params.id);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function handlePermanentDeleteProduct(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await productService.permanentDeleteProduct(req.params.id);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

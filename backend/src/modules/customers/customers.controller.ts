import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/authenticate';
import * as customerService from './customers.service';
import type {
  CreateCustomerDto,
  UpdateCustomerDto,
  ListCustomersDto,
  SaveOrFindCustomerDto,
} from './customers.validation';

export async function handleListCustomers(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as ListCustomersDto;
    const result = await customerService.listCustomers(query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleGetCustomer(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const includeOrders = req.query.includeOrders === 'true';
    const customer = await customerService.getCustomerById(req.params.id, includeOrders);
    res.status(200).json({ data: customer });
  } catch (error) {
    next(error);
  }
}

export async function handleCreateCustomer(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: CreateCustomerDto = req.body;
    const customer = await customerService.createCustomer(dto);
    res.status(201).json({ data: customer });
  } catch (error) {
    next(error);
  }
}

export async function handleSaveOrFindCustomer(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: SaveOrFindCustomerDto = req.body;
    const customer = await customerService.saveOrFindCustomer(dto);
    res.status(200).json({ data: customer });
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateCustomer(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: UpdateCustomerDto = req.body;
    const customer = await customerService.updateCustomer(req.params.id, dto);
    res.status(200).json({ data: customer });
  } catch (error) {
    next(error);
  }
}

export async function handleDeleteCustomer(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await customerService.deleteCustomer(req.params.id);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/authenticate';
import * as vendorService from './vendors.service';
import type {
  CreateVendorDto,
  UpdateVendorDto,
  ListVendorsDto,
} from './vendors.validation';

export async function handleListVendors(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as ListVendorsDto;
    const result = await vendorService.listVendors(query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleGetVendor(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const vendor = await vendorService.getVendorById(req.params.id);
    res.status(200).json({ data: vendor });
  } catch (error) {
    next(error);
  }
}

export async function handleCreateVendor(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: CreateVendorDto = req.body;
    const vendor = await vendorService.createVendor(dto);
    res.status(201).json({ data: vendor });
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateVendor(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: UpdateVendorDto = req.body;
    const vendor = await vendorService.updateVendor(req.params.id, dto);
    res.status(200).json({ data: vendor });
  } catch (error) {
    next(error);
  }
}

export async function handleDeleteVendor(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await vendorService.deleteVendor(req.params.id);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

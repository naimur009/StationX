import Vendor, { IVendor } from '../../models/Vendor';
import { createError } from '../../middleware/errorHandler';
import { escapeRegex } from '../../lib/escapeRegex';
import type {
  CreateVendorDto,
  UpdateVendorDto,
  ListVendorsDto,
} from './vendors.validation';

interface VendorResponse {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  itemsSupplied: string[];
  createdAt: Date;
  updatedAt: Date;
}

function toResponse(vendor: IVendor): VendorResponse {
  return {
    id: vendor._id.toString(),
    name: vendor.name,
    contactPerson: vendor.contactPerson,
    phone: vendor.phone,
    email: vendor.email,
    address: vendor.address,
    itemsSupplied: vendor.itemsSupplied,
    createdAt: vendor.createdAt,
    updatedAt: vendor.updatedAt,
  };
}

export async function listVendors(query: ListVendorsDto) {
  const filter: Record<string, unknown> = {};

  if (query.search) {
    filter.name = { $regex: escapeRegex(query.search), $options: 'i' };
  }

  const skip = (query.page - 1) * query.limit;

  const [vendors, total] = await Promise.all([
    Vendor.find(filter).sort({ name: 1 }).skip(skip).limit(query.limit).lean(),
    Vendor.countDocuments(filter),
  ]);

  const data = vendors.map((vendor) => ({
    id: vendor._id.toString(),
    name: vendor.name,
    contactPerson: vendor.contactPerson,
    phone: vendor.phone,
    email: vendor.email,
    address: vendor.address,
    itemsSupplied: vendor.itemsSupplied ?? [],
    createdAt: vendor.createdAt,
    updatedAt: vendor.updatedAt,
  }));

  return {
    data,
    meta: { total, page: query.page, limit: query.limit },
  };
}

export async function getVendorById(id: string) {
  const vendor = await Vendor.findById(id);

  if (!vendor) {
    throw createError(404, 'NOT_FOUND', 'Vendor not found');
  }

  return toResponse(vendor);
}

export async function createVendor(dto: CreateVendorDto) {
  const vendor = await Vendor.create(dto);
  return toResponse(vendor);
}

export async function updateVendor(id: string, dto: UpdateVendorDto) {
  const updated = await Vendor.findByIdAndUpdate(
    id,
    { $set: dto },
    { new: true, runValidators: true }
  );

  if (!updated) {
    throw createError(404, 'NOT_FOUND', 'Vendor not found');
  }

  return toResponse(updated);
}

export async function deleteVendor(id: string) {
  const vendor = await Vendor.findByIdAndDelete(id);

  if (!vendor) {
    throw createError(404, 'NOT_FOUND', 'Vendor not found');
  }

  return { success: true };
}

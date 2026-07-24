import Customer, { ICustomer } from '../../models/Customer';
import Order from '../../models/Order';
import { createError } from '../../middleware/errorHandler';
import { escapeRegex } from '../../lib/escapeRegex';
import type {
  CreateCustomerDto,
  UpdateCustomerDto,
  ListCustomersDto,
  SaveOrFindCustomerDto,
} from './customers.validation';

interface CustomerOrderSummary {
  id: string;
  total: number;
  status: string;
  createdAt: Date;
}

interface CustomerResponse {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  orderCount: number;
  orders?: CustomerOrderSummary[];
  createdAt: Date;
  updatedAt: Date;
}

function toCustomerResponse(c: ICustomer): CustomerResponse {
  return {
    id: c._id.toString(),
    name: c.name,
    phone: c.phone,
    email: c.email,
    address: c.address,
    orderCount: c.orderCount,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export async function listCustomers(query: ListCustomersDto) {
  const filter: Record<string, unknown> = {};

  if (query.search) {
    const escaped = escapeRegex(query.search);
    filter.$or = [
      { $text: { $search: query.search } },
      { phone: { $regex: escaped, $options: 'i' } },
    ];
  }

  const skip = (query.page - 1) * query.limit;

  const [customers, total] = await Promise.all([
    Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).lean(),
    Customer.countDocuments(filter),
  ]);

  const data = (customers as unknown as ICustomer[]).map(toCustomerResponse);

  return {
    data,
    meta: { total, page: query.page, limit: query.limit },
  };
}

export async function getCustomerById(id: string, includeOrders = false) {
  const customer = await Customer.findById(id).lean();

  if (!customer) {
    throw createError(404, 'NOT_FOUND', 'Customer not found');
  }

  const response = toCustomerResponse(customer as unknown as ICustomer);

  if (includeOrders) {
    const orders = await Order.find({ customerId: id })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('orderNumber grandTotal status createdAt')
      .lean();

    response.orders = orders.map((o) => ({
      id: o._id.toString(),
      total: o.grandTotal,
      status: o.status,
      createdAt: o.createdAt,
    }));
  }

  return response;
}

export async function createCustomer(dto: CreateCustomerDto) {
  const customer = await Customer.create({
    name: dto.name,
    phone: dto.phone,
    email: dto.email || undefined,
    address: dto.address || undefined,
    isActive: true,
  });

  return toCustomerResponse(customer);
}

export async function saveOrFindCustomer(dto: SaveOrFindCustomerDto) {
  const existing = await Customer.findOne({ phone: dto.phone });

  if (existing) {
    return toCustomerResponse(existing);
  }

  if (!dto.name) {
    throw createError(400, 'VALIDATION_ERROR', 'Name is required to create a new customer');
  }

  const customer = await Customer.create({
    name: dto.name,
    phone: dto.phone,
    email: dto.email || undefined,
    address: dto.address || undefined,
    isActive: true,
  });

  return toCustomerResponse(customer);
}

export async function updateCustomer(id: string, dto: UpdateCustomerDto) {
  const customer = await Customer.findById(id);

  if (!customer) {
    throw createError(404, 'NOT_FOUND', 'Customer not found');
  }

  const historyEntries: Array<{ field: string; oldValue: string; newValue: string; changedAt: Date }> = [];
  const updates: Record<string, unknown> = {};

  if (dto.name !== undefined && dto.name !== customer.name) {
    historyEntries.push({ field: 'name', oldValue: customer.name, newValue: dto.name, changedAt: new Date() });
    updates.name = dto.name;
  }
  if (dto.phone !== undefined && dto.phone !== customer.phone) {
    historyEntries.push({ field: 'phone', oldValue: customer.phone, newValue: dto.phone, changedAt: new Date() });
    updates.phone = dto.phone;
  }
  if (dto.email !== undefined && dto.email !== (customer.email || '')) {
    historyEntries.push({ field: 'email', oldValue: customer.email || '', newValue: dto.email || '', changedAt: new Date() });
    updates.email = dto.email || undefined;
  }
  if (dto.address !== undefined && dto.address !== (customer.address || '')) {
    historyEntries.push({ field: 'address', oldValue: customer.address || '', newValue: dto.address || '', changedAt: new Date() });
    updates.address = dto.address || undefined;
  }

  const updateOp: Record<string, unknown> = { $set: updates };
  if (historyEntries.length > 0) {
    updateOp.$push = { history: { $each: historyEntries } };
  }

  const updated = await Customer.findByIdAndUpdate(
    id,
    updateOp,
    { new: true, runValidators: true }
  );

  if (!updated) {
    throw createError(404, 'NOT_FOUND', 'Customer not found');
  }

  return toCustomerResponse(updated);
}

export async function deleteCustomer(id: string) {
  const customer = await Customer.findByIdAndDelete(id);

  if (!customer) {
    throw createError(404, 'NOT_FOUND', 'Customer not found');
  }

  return { success: true };
}

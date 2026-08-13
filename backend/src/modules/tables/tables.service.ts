import mongoose from 'mongoose';
import Table, { ITable } from '../../models/Table';
import Order from '../../models/Order';
import { createError } from '../../middleware/errorHandler';
import { getIO } from '../../config/socket';
import type { CreateTableDto, UpdateTableDto, UpdateTableStatusDto, ListTablesDto } from './tables.validation';

function toResponse(table: ITable) {
  return {
    id: table._id.toString(),
    tableNumber: table.tableNumber,
    capacity: table.capacity ?? null,
    status: table.status,
    currentOrderId: table.currentOrderId?.toString() ?? null,
    bookedBy: table.bookedBy ?? null,
    bookedAt: table.bookedAt ?? null,
    notes: table.notes ?? null,
    createdAt: table.createdAt,
    updatedAt: table.updatedAt,
  };
}

export async function listTables(query: ListTablesDto) {
  const filter: Record<string, unknown> = {};

  if (query.status) {
    filter.status = query.status;
  }

  const tables = await Table.find(filter)
    .sort({ tableNumber: 1 })
    .collation({ locale: 'en', numericOrdering: true })
    .lean();

  return {
    data: tables.map((t) => toResponse(t as unknown as ITable)),
  };
}

export async function getTableById(id: string) {
  const table = await Table.findById(id).lean();

  if (!table) {
    throw createError(404, 'NOT_FOUND', 'Table not found');
  }

  return { data: toResponse(table as unknown as ITable) };
}

export async function createTable(dto: CreateTableDto) {
  try {
    const table = await Table.create(dto);
    return { data: toResponse(table) };
  } catch (err) {
    if (err instanceof mongoose.Error && (err as { code?: number }).code === 11000) {
      throw createError(409, 'TABLE_NUMBER_IN_USE', 'A table with this number already exists');
    }
    throw err;
  }
}

export async function updateTable(id: string, dto: UpdateTableDto) {
  const table = await Table.findById(id);

  if (!table) {
    throw createError(404, 'NOT_FOUND', 'Table not found');
  }

  if (dto.tableNumber !== undefined && dto.tableNumber !== table.tableNumber) {
    const existing = await Table.findOne({ tableNumber: dto.tableNumber, _id: { $ne: id } });
    if (existing) {
      throw createError(409, 'TABLE_NUMBER_IN_USE', 'A table with this number already exists');
    }
  }

  const updates: Record<string, unknown> = {};
  if (dto.tableNumber !== undefined) updates.tableNumber = dto.tableNumber;
  if (dto.capacity !== undefined) updates.capacity = dto.capacity;

  try {
    const updated = await Table.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });

    if (!updated) {
      throw createError(404, 'NOT_FOUND', 'Table not found');
    }

    return { data: toResponse(updated) };
  } catch (err) {
    if (err instanceof mongoose.Error && (err as { code?: number }).code === 11000) {
      throw createError(409, 'TABLE_NUMBER_IN_USE', 'A table with this number already exists');
    }
    throw err;
  }
}

export async function updateTableStatus(id: string, dto: UpdateTableStatusDto) {
  const table = await Table.findById(id);

  if (!table) {
    throw createError(404, 'NOT_FOUND', 'Table not found');
  }

  if (dto.status === 'booked' && table.status === 'booked' && table.bookedBy === 'order') {
    throw createError(409, 'TABLE_ALREADY_BOOKED', 'Table is already booked by an active order. Cancel or complete the order first, or free the table manually.');
  }

  const updates: Record<string, unknown> = { status: dto.status };

  if (dto.status === 'booked') {
    updates.bookedBy = 'manual';
    updates.bookedAt = new Date();
    if (dto.notes !== undefined) updates.notes = dto.notes;

    if (table.currentOrderId) {
      updates.currentOrderId = null;
    }
  } else {
    updates.currentOrderId = null;
    updates.bookedBy = null;
    updates.bookedAt = null;
    if (dto.notes !== undefined) updates.notes = dto.notes;
  }

  const updated = await Table.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });

  if (!updated) {
    throw createError(404, 'NOT_FOUND', 'Table not found');
  }

  try {
    getIO().emit('table:statusChanged', {
      tableId: updated._id.toString(),
      tableNumber: updated.tableNumber,
      status: updated.status,
      orderId: updated.currentOrderId?.toString() ?? null,
    });
  } catch {
    // socket not available
  }

  return { data: toResponse(updated) };
}

export async function deleteTable(id: string) {
  const table = await Table.findById(id);

  if (!table) {
    throw createError(404, 'NOT_FOUND', 'Table not found');
  }

  if (table.currentOrderId) {
    const order = await Order.findById(table.currentOrderId).select('status paymentStatus');
    if (order && order.status !== 'cancelled' && order.status !== 'completed') {
      throw createError(409, 'TABLE_IN_USE', 'Cannot delete a table that has an active order. Complete, cancel, or move the order first.');
    }
  }

  await Table.findByIdAndDelete(id);

  return { data: { success: true } };
}

import mongoose from 'mongoose';
import Order from '../../models/Order';
import Product from '../../models/Product';
import Category from '../../models/Category';
import Coupon from '../../models/Coupon';
import ActivityLog from '../../models/ActivityLog';
import { createError } from '../../middleware/errorHandler';
import { getIO } from '../../config/socket';
import { renderPdf } from '../../lib/pdf';
import { escapeRegex } from '../../lib/escapeRegex';
import type {
  ListOrdersQuery,
  UpdateOrderDto,
  UpdateOrderStatusDto,
} from './orders.validation';

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['completed', 'cancelled'],
  completed: ['cancelled'],
  cancelled: [],
};

interface OrderListItem {
  id: string;
  orderNumber: string;
  tableNumber?: string;
  customerId: string | null;
  customerName?: string;
  customerPhone?: string;
  servedBy: string | null;
  grandTotal: number;
  status: string;
  createdAt: Date;
  createdBy: string;
}

interface OrderDetailItem {
  id: string;
  orderNumber: string;
  tableNumber?: string;
  customerId: unknown;
  customerName?: string;
  customerPhone?: string;
  servedBy?: unknown;
  items: Array<{
    productId: string;
    nameSnapshot: string;
    priceSnapshot: number;
    quantity: number;
    lineTotal: number;
  }>;
  couponId?: string | null;
  discountPercent: number;
  discountAmount: number;
  taxAmount: number;
  subtotal: number;
  grandTotal: number;
  cashTendered?: number;
  changeAmount?: number;
  payment: {
    method: string;
  };
  status: string;
  createdBy: unknown;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function toListItem(order: Record<string, unknown>): OrderListItem {
  const customerRaw = order.customerId as { _id?: string; name?: string } | undefined | null;
  return {
    id: order._id as string,
    orderNumber: order.orderNumber as string,
    tableNumber: order.tableNumber as string | undefined,
    customerId: customerRaw?._id?.toString() ?? null,
    customerName: customerRaw?.name ?? (order.customerName as string | undefined),
    customerPhone: order.customerPhone as string | undefined,
    servedBy: (order.servedBy as { name?: string } | null)?.name ?? (order.servedBy ? String(order.servedBy) : null),
    grandTotal: order.grandTotal as number,
    status: order.status as string,
    createdAt: order.createdAt as Date,
    createdBy: (order.createdBy as { _id?: string })?._id?.toString() ?? String(order.createdBy),
  };
}

function toDetail(order: Record<string, unknown>): OrderDetailItem {
  return {
    id: String(order._id),
    orderNumber: order.orderNumber as string,
    tableNumber: order.tableNumber as string | undefined,
    customerId: order.customerId ?? null,
    customerName: order.customerName as string | undefined,
    customerPhone: order.customerPhone as string | undefined,
    servedBy: order.servedBy ?? null,
    items: (order.items as Array<Record<string, unknown>>).map((i) => ({
      productId: String(i.productId),
      nameSnapshot: i.nameSnapshot as string,
      priceSnapshot: i.priceSnapshot as number,
      quantity: i.quantity as number,
      lineTotal: i.lineTotal as number,
    })),
    couponId: order.couponId ? String(order.couponId) : null,
    discountPercent: order.discountPercent as number,
    discountAmount: order.discountAmount as number,
    taxAmount: order.taxAmount as number,
    subtotal: order.subtotal as number,
    grandTotal: order.grandTotal as number,
    cashTendered: order.cashTendered as number | undefined,
    changeAmount: order.changeAmount as number | undefined,
    payment: order.payment as { method: string },
    status: order.status as string,
    createdBy: order.createdBy ?? null,
    completedAt: order.completedAt as Date | undefined,
    cancelledAt: order.cancelledAt as Date | undefined,
    cancelReason: order.cancelReason as string | undefined,
    createdAt: order.createdAt as Date,
    updatedAt: order.updatedAt as Date,
  };
}

export function formatBdt(n: number): string {
  return `\u09F3${n.toFixed(2)}`;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderBillHtml(order: Record<string, unknown>): string {
  const items = (order.items as Array<Record<string, unknown>>) || [];
  const lineItems = items
    .map(
      (item) => `
    <tr>
      <td>${escapeHtml(item.nameSnapshot as string)}</td>
      <td style="text-align: center">${item.quantity}</td>
      <td style="text-align: right">${formatBdt(item.priceSnapshot as number)}</td>
      <td style="text-align: right">${formatBdt(item.lineTotal as number)}</td>
    </tr>`
    )
    .join('');

  const payment = order.payment as { method: string } | undefined;
  const paymentLine = payment
    ? `Paid: ${payment.method.toUpperCase()}`
    : '';

  const customer = order.customerId as { name?: string } | null | undefined;
  const customerLine = customer && typeof customer === 'object' && customer.name
    ? `<p>Customer: ${escapeHtml(customer.name)}</p>`
    : '';

  const cancelledLine = order.status === 'cancelled' && order.cancelReason
    ? `<p>Cancelled: ${escapeHtml(order.cancelReason as string)}</p>`
    : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Bill - ${escapeHtml(order.orderNumber as string)}</title>
<style>
  body { font-family: 'Courier New', monospace; font-size: 12px; max-width: 300px; margin: 0 auto; padding: 16px; }
  h1 { text-align: center; font-size: 16px; margin-bottom: 4px; }
  .meta { text-align: center; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th { border-bottom: 1px dashed #000; padding: 4px 0; text-align: left; }
  td { padding: 4px 0; }
  .total-row td { border-top: 1px dashed #000; padding-top: 8px; font-weight: bold; }
  .footer { text-align: center; margin-top: 24px; font-size: 10px; }
</style></head><body>
<h1>StationX</h1>
<div class="meta">
  <p>${escapeHtml(order.orderNumber as string)}</p>
  <p>${new Date(order.createdAt as Date).toLocaleString()}</p>
  ${order.tableNumber ? `<p>Table ${escapeHtml(order.tableNumber as string)}</p>` : ''}
</div>
<table>
  <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
  <tbody>${lineItems}</tbody>
  <tfoot>
    <tr><td colspan="3" style="text-align: right">Subtotal</td><td style="text-align: right">${formatBdt(order.subtotal as number)}</td></tr>
    ${(order.discountAmount as number) > 0 ? `<tr><td colspan="3" style="text-align: right">Discount</td><td style="text-align: right">-${formatBdt(order.discountAmount as number)}</td></tr>` : ''}
    ${(order.taxAmount as number) > 0 ? `<tr><td colspan="3" style="text-align: right">Tax</td><td style="text-align: right">${formatBdt(order.taxAmount as number)}</td></tr>` : ''}
    <tr class="total-row"><td colspan="3" style="text-align: right">Grand Total</td><td style="text-align: right">${formatBdt(order.grandTotal as number)}</td></tr>
  </tfoot>
</table>
${paymentLine ? `<div class="meta" style="margin-top: 16px"><p>${paymentLine}</p></div>` : ''}
${customerLine}
${cancelledLine}
<div class="footer">Thank you!</div>
</body></html>`;
}

export async function listOrders(query: ListOrdersQuery) {
  const filter: Record<string, unknown> = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.from || query.to) {
    const dateFilter: Record<string, Date> = {};
    if (query.from) dateFilter.$gte = new Date(query.from);
    if (query.to) {
      const to = new Date(query.to);
      to.setHours(23, 59, 59, 999);
      dateFilter.$lte = to;
    }
    filter.createdAt = dateFilter;
  }

  if (query.createdBy) {
    filter.createdBy = new mongoose.Types.ObjectId(query.createdBy);
  }

  if (query.customerId) {
    filter.customerId = new mongoose.Types.ObjectId(query.customerId);
  }

  if (query.customerPhone) {
    filter.customerPhone = { $regex: escapeRegex(query.customerPhone), $options: 'i' };
  }

  if (query.search) {
    filter.orderNumber = { $regex: escapeRegex(query.search), $options: 'i' };
  }

  const sortField: Record<string, 1 | -1> = query.sort === '-createdAt' ? { createdAt: -1 } : { createdAt: 1 };
  const skip = (query.page - 1) * query.limit;

  const projection = {
    _id: 1,
    orderNumber: 1,
    tableNumber: 1,
    customerName: 1,
    customerPhone: 1,
    grandTotal: 1,
    status: 1,
    createdAt: 1,
    createdBy: 1,
    customerId: 1,
  };

  const [orders, total] = await Promise.all([
    Order.find(filter, projection)
      .populate('customerId', 'name')
      .populate('servedBy', 'name')
      .sort(sortField).skip(skip).limit(query.limit).lean(),
    Order.countDocuments(filter),
  ]);

  const data = orders.map((o) => toListItem(o as unknown as Record<string, unknown>));

  return {
    data,
    meta: { total, page: query.page, limit: query.limit },
  };
}

export async function getOrderById(id: string) {
  const order = await Order.findById(id)
    .populate('customerId', 'name phone')
    .populate('servedBy', 'name')
    .populate('createdBy', 'name')
    .lean();

  if (!order) {
    throw createError(404, 'NOT_FOUND', 'Order not found');
  }

  return { data: toDetail(order as unknown as Record<string, unknown>) };
}

export async function updateOrder(id: string, dto: UpdateOrderDto) {
  const order = await Order.findById(id);
  if (!order) {
    throw createError(404, 'NOT_FOUND', 'Order not found');
  }

  const updates: Record<string, unknown> = {};
  if (dto.tableNumber !== undefined) updates.tableNumber = dto.tableNumber;
  if (dto.customerId !== undefined) updates.customerId = dto.customerId;

  if (dto.items) {
    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const products = await Product.find({ _id: { $in: productIds }, isActive: true });
    if (products.length !== productIds.length) {
      throw createError(400, 'VALIDATION_ERROR', 'One or more products not found or inactive');
    }

    const productMap = new Map(products.map((p) => [p._id.toString(), p]));
    for (const item of dto.items) {
      if (!productMap.has(item.productId)) {
        throw createError(400, 'VALIDATION_ERROR', `Product ${item.productId} not found`);
      }
    }

    const newItems = dto.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const lineTotal = round2(product.price * item.quantity);
      return {
        productId: product._id as unknown as mongoose.Types.ObjectId,
        nameSnapshot: product.name,
        priceSnapshot: product.price,
        quantity: item.quantity,
        lineTotal,
      };
    });

    updates.items = newItems;
    const subtotal = round2(newItems.reduce((sum, i) => sum + i.lineTotal, 0));
    updates.subtotal = subtotal;

    const categoryIds = [...new Set(products.map((p) => p.categoryId?.toString()).filter(Boolean))] as string[];
    const categories = categoryIds.length > 0 ? await Category.find({ _id: { $in: categoryIds } }) : [];
    const categoryTaxMap = new Map(categories.map((c) => [c._id.toString(), c.taxRate]));
    const taxAmount = round2(
      newItems.reduce((sum, item, idx) => {
        const product = products[idx];
        const catId = product.categoryId?.toString();
        const taxRate = catId ? (categoryTaxMap.get(catId) ?? 0) : 0;
        return sum + round2(item.lineTotal * (taxRate / 100));
      }, 0)
    );
    updates.taxAmount = taxAmount;

    if (dto.discountPercent === undefined) {
      let discountAmount = 0;
      if (order.couponId) {
        const coupon = await Coupon.findById(order.couponId);
        if (coupon && coupon.isEnabled && coupon.validUntil > new Date()) {
          const rawDiscount = coupon.discountType === 'percentage'
            ? round2(subtotal * (coupon.value / 100))
            : round2(coupon.value);
          discountAmount = coupon.maxDiscountAmount != null
            ? Math.min(rawDiscount, coupon.maxDiscountAmount)
            : rawDiscount;
        }
      } else if (order.discountPercent && order.discountPercent > 0) {
        discountAmount = round2(subtotal * (order.discountPercent / 100));
      }
      updates.discountAmount = discountAmount;
      const newGrandTotal = round2(subtotal - discountAmount + taxAmount);
      updates.grandTotal = newGrandTotal;
    } else {
      const discountAmount = round2(subtotal * (dto.discountPercent! / 100));
      updates.discountPercent = dto.discountPercent!;
      updates.discountAmount = discountAmount;
      updates.couponId = null;
      const newGrandTotal = round2(subtotal - discountAmount + taxAmount);
      updates.grandTotal = newGrandTotal;
    }
  }

  if (dto.discountPercent !== undefined && !dto.items) {
    const baseSubtotal = order.subtotal;
    const discountAmount = round2(baseSubtotal * (dto.discountPercent / 100));
    updates.discountPercent = dto.discountPercent;
    updates.discountAmount = discountAmount;
    updates.couponId = null;
    updates.taxAmount = 0;
    updates.grandTotal = round2(baseSubtotal - discountAmount);
  }

  if (dto.payment) {
    if (dto.payment.method) updates['payment.method'] = dto.payment.method;
  }

  if (dto.cashTendered !== undefined) updates.cashTendered = dto.cashTendered;
  if (dto.changeAmount !== undefined) updates.changeAmount = dto.changeAmount;

  const updated = await Order.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!updated) {
    throw createError(404, 'NOT_FOUND', 'Order not found');
  }

  try {
    getIO().emit('order:updated', {
      orderId: updated._id.toString(),
      orderNumber: updated.orderNumber,
    });
  } catch {
    // socket not available
  }

    const populated = await Order.findById(updated._id)
      .populate('customerId', 'name phone')
      .populate('servedBy', 'name')
      .populate('createdBy', 'name')
      .lean();

  return { data: toDetail(populated as unknown as Record<string, unknown>) };
}

export async function updateOrderStatus(id: string, dto: UpdateOrderStatusDto) {
  const order = await Order.findById(id);

  if (!order) {
    throw createError(404, 'NOT_FOUND', 'Order not found');
  }

  const currentStatus = order.status;
  const targetStatus = dto.status;

  if (currentStatus === targetStatus) {
    const populated = await Order.findById(order._id)
      .populate('customerId', 'name phone')
      .populate('servedBy', 'name')
      .populate('createdBy', 'name')
      .lean();
    return { data: toDetail(populated as unknown as Record<string, unknown>) };
  }

  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw createError(
      400,
      'VALIDATION_ERROR',
      `Cannot transition from '${currentStatus}' to '${targetStatus}'. Allowed transitions: ${allowed.length > 0 ? allowed.join(', ') : 'none (terminal state)'}`
    );
  }

  if (targetStatus === 'cancelled' && !dto.cancelReason) {
    throw createError(400, 'VALIDATION_ERROR', 'Cancel reason is required when cancelling an order');
  }

  const setFields: Record<string, unknown> = { status: targetStatus };

  if (targetStatus === 'completed') {
    setFields.completedAt = new Date();
    setFields.cancelledAt = null;
    setFields.cancelReason = null;
  } else if (targetStatus === 'cancelled') {
    setFields.cancelledAt = new Date();
    setFields.cancelReason = dto.cancelReason;
    setFields.completedAt = null;
  }

  const updated = await Order.findByIdAndUpdate(
    id,
    { $set: setFields },
    { new: true, runValidators: true }
  );

  if (!updated) {
    throw createError(404, 'NOT_FOUND', 'Order not found');
  }

  try {
    getIO().emit('order:statusChanged', {
      orderId: updated._id.toString(),
      status: updated.status,
      orderNumber: updated.orderNumber,
    });
  } catch {
    // socket not available
  }

  const populated = await Order.findById(updated._id)
    .populate('customerId', 'name phone')
    .populate('servedBy', 'name')
    .populate('createdBy', 'name')
    .lean();

  return { data: toDetail(populated as unknown as Record<string, unknown>) };
}

export async function deleteOrder(id: string) {
  const order = await Order.findById(id);
  if (!order) {
    throw createError(404, 'NOT_FOUND', 'Order not found');
  }

  await Order.findByIdAndDelete(id);

  try {
    getIO().emit('order:deleted', { orderId: id });
  } catch {
    // socket not available
  }

  return { data: { success: true } };
}

export async function getOrderBill(id: string, format: string) {
  const order = await Order.findById(id)
    .populate('customerId', 'name phone')
    .populate('servedBy', 'name')
    .populate('createdBy', 'name')
    .lean();

  if (!order) {
    throw createError(404, 'NOT_FOUND', 'Order not found');
  }

  const html = renderBillHtml(order as unknown as Record<string, unknown>);

  if (format === 'pdf') {
    const pdf = await renderPdf(html);
    return { pdf, filename: `bill-${order.orderNumber}.pdf` };
  }

  return { data: { html } };
}

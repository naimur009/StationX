import mongoose from 'mongoose';
import Order from '../../models/Order';
import Product from '../../models/Product';
import Category from '../../models/Category';
import Coupon from '../../models/Coupon';
import Settings from '../../models/Settings';
import ActivityLog from '../../models/ActivityLog';
import { createError } from '../../middleware/errorHandler';
import { getIO } from '../../config/socket';
import { withTransaction } from '../../lib/transaction';
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
  paymentStatus: string;
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
  paymentStatus: string;
  payment?: {
    method: string;
    transactionId?: string;
  };
  previousPayments: Array<{
    method: string;
    amount: number;
    transactionId?: string;
  }>;
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
    paymentStatus: order.paymentStatus as string,
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
    paymentStatus: order.paymentStatus as string,
    payment: order.payment as { method: string; transactionId?: string } | undefined,
    previousPayments: ((order.previousPayments as Array<Record<string, unknown>>) || []).map((p) => ({
      method: p.method as string,
      amount: p.amount as number,
      transactionId: p.transactionId as string | undefined,
    })),
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

interface BillSettings {
  restaurantName?: string;
  address?: string;
  contactNumber?: string;
  logo?: { url?: string };
  vatInfo?: { bin?: string; mushak?: string };
}

export function renderBillHtml(order: Record<string, unknown>, settings?: BillSettings): string {
  const items = (order.items as Array<Record<string, unknown>>) || [];
  const lineItems = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 3px 0">${escapeHtml(item.nameSnapshot as string)}</td>
      <td style="text-align: center; padding: 3px 0">${item.quantity}</td>
      <td style="text-align: right; padding: 3px 0">${formatBdt(item.priceSnapshot as number)}</td>
      <td style="text-align: right; padding: 3px 0">${formatBdt(item.lineTotal as number)}</td>
    </tr>`
    )
    .join('');

  const subtotal = order.subtotal as number;
  const discountAmount = order.discountAmount as number;
  const taxAmount = order.taxAmount as number;
  const totalWithVat = round2(subtotal + taxAmount);
  const totalDiscount = round2(discountAmount + taxAmount);
  const grandTotal = round2(totalWithVat - totalDiscount);
  const roundedGrand = Math.floor(grandTotal);
  const autoRound = +(roundedGrand - grandTotal).toFixed(2);

  const paymentStatus = order.paymentStatus as string | undefined;
  const payment = order.payment as { method: string; transactionId?: string } | undefined;
  const previousPayments = (order.previousPayments as Array<{ method: string; amount: number; transactionId?: string }>) || [];
  const previousPaymentsTotal = previousPayments.reduce((s, p) => s + p.amount, 0);
  const cashTendered = order.cashTendered as number | undefined;
  const changeAmountStored = order.changeAmount as number | undefined;

  const customer = order.customerId as { name?: string; phone?: string } | null | undefined;
  const createdBy = order.createdBy as { name?: string } | null | undefined;
  const servedBy = order.servedBy as { name?: string } | null | undefined;

  const address = settings?.address || '';
  const contactNumber = settings?.contactNumber || '';
  const logoUrl = settings?.logo?.url || '';
  const bin = settings?.vatInfo?.bin || '';
  const mushak = settings?.vatInfo?.mushak || '';

  const createdAt = order.createdAt as Date | string | undefined;
  const dateStr = createdAt ? new Date(createdAt).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const timeStr = createdAt ? new Date(createdAt).toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' }) : '';

  const cancelledLine = order.status === 'cancelled' && order.cancelReason
    ? `<p style="text-align: center; margin-top: 8px; font-size: 11px; color: #666;">Cancelled: ${escapeHtml(order.cancelReason as string)}</p>`
    : '';

  const orderNumber = escapeHtml(order.orderNumber as string);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Bill - ${orderNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', Courier, monospace; font-size: 11px; line-height: 1.4; color: #000; max-width: 300px; margin: 0 auto; padding: 16px; }
  .header { text-align: center; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px dashed #ccc; }
  .header img { max-width: 80px; max-height: 80px; margin-bottom: 6px; filter: grayscale(100%); }
  .header h1 { font-size: 15px; font-weight: bold; margin-bottom: 2px; }
  .header p { font-size: 10px; color: #555; }
  .header .bin-line { font-size: 10px; color: #555; margin-top: 2px; }
  .info-row { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px; }
  .meta { margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px dashed #ccc; font-size: 10px; }
  .meta .info-row span:first-child { color: #555; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  thead th { border-bottom: 1px dashed #000; padding: 4px 0; font-size: 10px; text-align: left; text-transform: uppercase; }
  thead th:last-child, thead th:nth-last-child(2) { text-align: right; }
  tbody td { padding: 3px 0; vertical-align: top; }
  tbody td:first-child { padding-left: 0; }
  .totals { margin-top: 4px; padding-top: 4px; border-top: 1px dashed #ccc; }
  .total-line { display: flex; justify-content: space-between; font-size: 10px; padding: 2px 0; }
  .total-line .label { color: #555; }
  .grand-total { display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; padding-top: 6px; margin-top: 4px; border-top: 1px solid #000; }
  .payments { margin-top: 12px; padding-top: 8px; border-top: 1px dashed #ccc; font-size: 10px; }
  .payments h3 { font-size: 10px; text-transform: uppercase; margin-bottom: 4px; color: #555; }
  .payments .total-line .label { color: #555; }
  .change { color: #c00; }
  .footer { text-align: center; margin-top: 20px; padding-top: 12px; border-top: 1px dashed #ccc; font-size: 10px; color: #888; }
  .footer p { margin-bottom: 2px; }
  .page-break { page-break-before: always; }
  @media print { body { max-width: none; padding: 12px; } .header img { max-width: 60px; max-height: 60px; filter: grayscale(100%); } }
  .kitchen-header { text-align: center; margin-bottom: 24px; }
  .kitchen-header h1 { font-size: 26px; font-weight: bold; }
  .kitchen-header .sub { font-size: 18px; color: #c00; font-weight: bold; margin-top: 6px; }
  .kitchen-meta { margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid #000; font-size: 18px; }
  .kitchen-meta .info-row span:first-child { color: #555; }
  .kitchen-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  .kitchen-table thead th { border-bottom: 2px solid #000; padding: 10px 0; font-size: 18px; text-align: left; text-transform: uppercase; }
  .kitchen-table tbody td { padding: 10px 0; font-size: 18px; }
</style></head><body>

<div class="header">
  ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Logo" />` : ''}

  ${address ? `<p>${escapeHtml(address)}</p>` : ''}
  ${contactNumber ? `<p>Phone# : ${escapeHtml(contactNumber)}</p>` : ''}
  ${bin ? `<p class="bin-line">BIN: ${escapeHtml(bin)}</p>` : ''}
  ${mushak ? `<p class="bin-line">Mushak-${escapeHtml(mushak)}</p>` : ''}
</div>

<div class="meta">
  ${order.tableNumber ? `<div class="info-row"><span>Table</span><span>${escapeHtml(order.tableNumber as string)}</span></div>` : ''}
  ${servedBy?.name ? `<div class="info-row"><span>Served By</span><span>${escapeHtml(servedBy.name)}</span></div>` : createdBy?.name ? `<div class="info-row"><span>Served By</span><span>${escapeHtml(createdBy.name)}</span></div>` : ''}
  <div class="info-row"><span>Date</span><span>${dateStr}</span></div>
  <div class="info-row"><span>Time</span><span>${timeStr}</span></div>
  <div class="info-row"><span>Invoice</span><span>${orderNumber}</span></div>
  <div class="info-row"><span>Status</span><span style="font-weight:bold;">${paymentStatus === 'paid' ? 'PAID' : 'UNPAID'}</span></div>
  ${customer && typeof customer === 'object' ? `<div class="info-row"><span>Customer</span><span>${escapeHtml(customer.name || customer.phone || '')}</span></div>` : ''}
</div>

<table>
  <thead>
    <tr><th>Item</th><th style="text-align: center">Qty</th><th style="text-align: right">Price</th><th style="text-align: right">Total</th></tr>
  </thead>
  <tbody>${lineItems}</tbody>
</table>

<div class="totals">
  <div class="total-line"><span class="label">Subtotal</span><span>${formatBdt(subtotal)}</span></div>
  ${taxAmount > 0 ? `<div class="total-line"><span class="label">VAT</span><span>${formatBdt(taxAmount)}</span></div>` : ''}
  <div class="total-line" style="font-weight: 600;"><span class="label">Subtotal + VAT</span><span>${formatBdt(totalWithVat)}</span></div>
  ${totalDiscount > 0 ? `<div class="total-line"><span class="label">Discount</span><span>-${formatBdt(totalDiscount)}</span></div>` : ''}
  ${autoRound !== 0 ? `<div class="total-line"><span class="label">Auto Round</span><span>${formatBdt(autoRound)}</span></div>` : ''}
  <div class="grand-total"><span>Grand Total</span><span>${formatBdt(roundedGrand)}</span></div>
</div>

${paymentStatus === 'paid'
  ? `<div class="payments">
  <div style="text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 12px;">— PAID —</div>
  <h3>Payments</h3>
  ${previousPayments.map((p) => `
  <div class="total-line"><span class="label">${p.method.toUpperCase()}</span><span>${formatBdt(p.amount)}</span></div>
  `).join('')}
  ${payment && payment.method !== 'cash' ? `<div class="total-line" style="font-weight:600"><span class="label">${payment.method.toUpperCase()}</span><span>${formatBdt(roundedGrand - previousPaymentsTotal)}</span></div>` : ''}
  ${payment && payment.method === 'cash' ? `<div class="total-line" style="font-weight:600"><span class="label">CASH</span></div>` : ''}
  ${cashTendered != null ? `<div class="total-line"><span class="label">Cash Tendered</span><span>${formatBdt(cashTendered)}</span></div>` : ''}
  ${changeAmountStored != null && changeAmountStored > 0 ? `<div class="total-line change"><span class="label">Returned</span><span>${formatBdt(changeAmountStored)}</span></div>` : ''}
</div>`
  : `<div class="payments" style="text-align: center; font-weight: bold; font-size: 14px; color: #c00;">
  — UNPAID —
</div>`}

${cancelledLine}

<div class="footer">
  <p>THANK YOU FOR VISITING</p>
  <p>If you have any complaints or suggestions,<br />please contact our manager immediately.</p>
  <p>Your feedback helps us improve.</p>
  <p>Have a Wonderful Day!</p>
</div>

${paymentStatus !== 'paid' ? `
<div class="page-break"></div>

<div class="kitchen-header">
  <h1>${escapeHtml(settings?.restaurantName || '')}</h1>
  <p class="sub">— KITCHEN COPY —</p>
</div>

<div class="kitchen-meta">
  <div class="info-row"><span>Invoice</span><span>${orderNumber}</span></div>
  ${order.tableNumber ? `<div class="info-row"><span>Table</span><span>${escapeHtml(order.tableNumber as string)}</span></div>` : ''}
  ${servedBy?.name ? `<div class="info-row"><span>Served By</span><span>${escapeHtml(servedBy.name)}</span></div>` : createdBy?.name ? `<div class="info-row"><span>Served By</span><span>${escapeHtml(createdBy.name)}</span></div>` : ''}
  <div class="info-row"><span>Date</span><span>${dateStr}</span></div>
  <div class="info-row"><span>Time</span><span>${timeStr}</span></div>
</div>

<table class="kitchen-table">
  <thead>
    <tr><th>Item</th><th style="text-align: center">Qty</th></tr>
  </thead>
  <tbody>
    ${items.map((item) => `
    <tr>
      <td>${escapeHtml(item.nameSnapshot as string)}</td>
      <td style="text-align: center">${item.quantity}</td>
    </tr>`).join('')}
  </tbody>
</table>
` : ''}

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
    paymentStatus: 1,
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

  if (order.paymentStatus === 'paid') {
    const financialFields = dto.items || dto.discountPercent !== undefined || dto.payment || dto.cashTendered !== undefined || dto.changeAmount !== undefined;
    if (financialFields) {
      throw createError(400, 'ORDER_ALREADY_PAID', 'Cannot edit items or financial fields on a paid order');
    }
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
    const categoryTaxMap = new Map(categories.map((c) => [c._id.toString(), c.vatRate]));
    const taxAmount = round2(
      newItems.reduce((sum, item, idx) => {
        const dtoItem = dto.items![idx];
        const product = productMap.get(dtoItem.productId)!;
        const catId = product.categoryId?.toString();
        const vatRate = catId ? (categoryTaxMap.get(catId) ?? 0) : 0;
        return sum + round2(item.lineTotal * (vatRate / 100));
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
      const newGrandTotal = round2(subtotal - discountAmount);
      updates.grandTotal = newGrandTotal;
    } else {
      const discountAmount = round2(subtotal * (dto.discountPercent! / 100));
      updates.discountPercent = dto.discountPercent!;
      updates.discountAmount = discountAmount;
      updates.couponId = null;
      const newGrandTotal = round2(subtotal - discountAmount);
      updates.grandTotal = newGrandTotal;
    }
  }

  if (dto.discountPercent !== undefined && !dto.items) {
    const baseSubtotal = order.subtotal;
    const discountAmount = round2(baseSubtotal * (dto.discountPercent / 100));
    updates.discountPercent = dto.discountPercent;
    updates.discountAmount = discountAmount;
    updates.couponId = null;
    updates.taxAmount = order.taxAmount;
    updates.grandTotal = round2(baseSubtotal - discountAmount);
  }

  if (dto.payment) {
    const oldPayment = order.payment;
    const oldMethod = oldPayment?.method;
    const newMethod = dto.payment.method;
    if (newMethod && oldMethod && newMethod !== oldMethod) {
      const oldGrandTotal = order.grandTotal;
      const sumPreviousPayment = (order.previousPayments || []).reduce(
        (s, p) => s + p.amount, 0
      );
      const oldAmount = oldMethod === 'cash'
        ? round2((order.cashTendered ?? oldGrandTotal) - (order.changeAmount ?? 0))
        : round2(Math.max(0, oldGrandTotal - sumPreviousPayment));
      const entry: Record<string, unknown> = { method: oldMethod, amount: round2(oldAmount) };
      if (oldPayment?.transactionId) {
        entry.transactionId = oldPayment.transactionId;
      }
      await Order.updateOne({ _id: id }, { $push: { previousPayments: entry } });
    }
    if (dto.payment.method) updates['payment.method'] = dto.payment.method;
    if (dto.payment.transactionId !== undefined) updates['payment.transactionId'] = dto.payment.transactionId;
  }

  if (dto.cashTendered !== undefined) {
    const effectiveGrandTotal = (updates.grandTotal ?? order.grandTotal) as number;
    const effectivePaymentMethod = (dto.payment?.method ?? order.payment?.method ?? 'cash') as string;
    if (effectivePaymentMethod === 'cash') {
      const alreadyCollected = order.payment?.method === 'cash'
        ? (order.cashTendered ?? 0)
        : order.grandTotal;
      const totalCollected = order.payment?.method === 'cash'
        ? dto.cashTendered
        : order.grandTotal + dto.cashTendered;
      if (totalCollected < effectiveGrandTotal) {
        throw createError(400, 'VALIDATION_ERROR', 'Total payment must cover the grand total.');
      }
    }
    updates.cashTendered = dto.cashTendered;
    if (dto.changeAmount !== undefined) {
      updates.changeAmount = dto.changeAmount;
    } else if (dto.cashTendered >= effectiveGrandTotal) {
      updates.changeAmount = round2(dto.cashTendered - effectiveGrandTotal);
    }
  }

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

  if (dto.items && updated.status === 'completed') {
    try {
      getIO().emit('order:itemsUpdated', {
        orderId: updated._id.toString(),
        orderNumber: updated.orderNumber,
      });
    } catch {
      // socket not available
    }
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

  if (dto.paymentStatus === 'paid') {
    if (order.paymentStatus === 'paid') {
      const populated = await Order.findById(order._id)
        .populate('customerId', 'name phone')
        .populate('servedBy', 'name')
        .populate('createdBy', 'name')
        .lean();
      return { data: toDetail(populated as unknown as Record<string, unknown>) };
    }

    if (!dto.payment || !dto.payment.method) {
      throw createError(400, 'VALIDATION_ERROR', 'Payment method is required when marking an order as paid');
    }

    const grandTotal = order.grandTotal;
    const cashTendered = dto.cashTendered;
    const changeAmount = dto.changeAmount;

    if (dto.payment.method === 'cash') {
      if (cashTendered == null || cashTendered < grandTotal) {
        throw createError(400, 'VALIDATION_ERROR', 'Cash tendered must cover the grand total');
      }
    }

    await withTransaction(async (session) => {
      const setFields: Record<string, unknown> = {
        paymentStatus: 'paid',
        'payment.method': dto.payment!.method,
      };

      if (dto.payment!.transactionId) {
        setFields['payment.transactionId'] = dto.payment!.transactionId;
      }

      if (cashTendered != null) {
        setFields.cashTendered = cashTendered;
        setFields.changeAmount = changeAmount != null ? changeAmount : round2(Math.max(0, cashTendered - grandTotal));
      }

      await Order.findByIdAndUpdate(id, { $set: setFields }, { session });

      if (order.couponId) {
        await Coupon.findByIdAndUpdate(order.couponId, { $inc: { usageCount: 1 } }, { session });
      }

      await ActivityLog.create([{
        actor: new mongoose.Types.ObjectId(order.createdBy.toString()),
        module: 'orders',
        action: 'pos.order_paid',
        targetId: order._id.toString(),
        targetType: 'Order',
        description: `Payment captured for ${order.orderNumber} — ${dto.payment!.method.toUpperCase()}, BDT ${grandTotal.toFixed(2)}`,
      }], { session });
    });

    try {
      getIO().emit('order:paid', {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        paymentStatus: 'paid',
      });
    } catch {
      // socket not available
    }

    const populated = await Order.findById(order._id)
      .populate('customerId', 'name phone')
      .populate('servedBy', 'name')
      .populate('createdBy', 'name')
      .lean();

    return { data: toDetail(populated as unknown as Record<string, unknown>) };
  }

  const currentStatus = order.status;
  const targetStatus = dto.status!;

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

  const settingsDoc = await Settings.findById('restaurant-settings').lean();
  const settings = settingsDoc
    ? {
        restaurantName: settingsDoc.restaurantName,
        address: settingsDoc.address,
        contactNumber: settingsDoc.contactNumber,
        logo: settingsDoc.logo ? { url: settingsDoc.logo.url } : undefined,
        vatInfo: settingsDoc.vatInfo ? { bin: settingsDoc.vatInfo.bin, mushak: settingsDoc.vatInfo.mushak } : undefined,
      }
    : undefined;

  const html = renderBillHtml(order as unknown as Record<string, unknown>, settings);

  if (format === 'pdf') {
    const pdf = await renderPdf(html);
    return { pdf, filename: `bill-${order.orderNumber}.pdf` };
  }

  return { data: { html } };
}

import Product from '../../models/Product';
import Category from '../../models/Category';
import Coupon from '../../models/Coupon';
import Customer from '../../models/Customer';
import Employee from '../../models/Employee';
import Order from '../../models/Order';
import Table from '../../models/Table';
import ActivityLog from '../../models/ActivityLog';
import { withTransaction } from '../../lib/transaction';
import { getNextSequence } from '../../lib/counter';
import { createError } from '../../middleware/errorHandler';
import { getIO } from '../../config/socket';
import { escapeRegex } from '../../lib/escapeRegex';
import type { CreateOrderDto, ValidateCouponDto } from './pos.validation';
import type { ICoupon } from '../../models/Coupon';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function getDiscountInfo(coupon: ICoupon, subtotal: number): { discountAmount: number; couponId: string } {
  const rawDiscount = coupon.discountType === 'percentage'
    ? round2(subtotal * (coupon.value / 100))
    : round2(coupon.value);

  const discountAmount = coupon.maxDiscountAmount != null
    ? Math.min(rawDiscount, coupon.maxDiscountAmount)
    : rawDiscount;

  return { discountAmount, couponId: coupon._id.toString() };
}

export async function getEmployees(limit?: number) {
  const employees = await Employee.find()
    .select('name')
    .sort({ name: 1 })
    .limit(limit ?? 500)
    .lean();

  return employees.map((e) => ({
    id: e._id.toString(),
    name: e.name,
  }));
}

export async function getCatalog(limit?: number, categoryId?: string, search?: string) {
  const filter: Record<string, unknown> = { isActive: true };
  if (categoryId) {
    filter.categoryId = categoryId;
  }
  if (search) {
    filter.name = { $regex: escapeRegex(search), $options: 'i' };
  }

  const products = await Product.find(filter)
    .select('name price image categoryId')
    .populate('categoryId', 'name vatRate')
    .sort({ name: 1 })
    .limit(limit ?? 1000)
    .lean();

  return (products as unknown as Array<{
    _id: { toString(): string };
    name: string;
    price: number;
    image?: { url: string } | null;
    categoryId: { _id: string; name: string; vatRate: number } | string | null;
  }>).map((p) => {
    const cat = p.categoryId as { _id: string; name: string; vatRate: number } | null;
    return {
      id: p._id.toString(),
      name: p.name,
      price: p.price,
      image: { url: p.image?.url || null },
      category: cat?.name || null,
      categoryId: cat?._id?.toString() || null,
      vatRate: cat?.vatRate ?? 0,
    };
  });
}

export async function validateCoupon(dto: ValidateCouponDto) {
  const coupon = await Coupon.findOne({ code: dto.code });

  if (!coupon) {
    return { valid: false, reason: 'NOT_FOUND' as const };
  }

  if (!coupon.isEnabled) {
    return { valid: false, reason: 'DISABLED' as const };
  }

  const now = new Date();
  if (coupon.validFrom > now) {
    return { valid: false, reason: 'NOT_YET_VALID' as const };
  }

  if (coupon.validUntil < now) {
    return { valid: false, reason: 'EXPIRED' as const };
  }

  if (coupon.minOrderAmount != null && dto.subtotal < coupon.minOrderAmount) {
    return { valid: false, reason: 'BELOW_MIN_ORDER' as const };
  }

  if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) {
    return { valid: false, reason: 'USAGE_LIMIT_REACHED' as const };
  }

  const rawDiscount = coupon.discountType === 'percentage'
    ? round2(dto.subtotal * (coupon.value / 100))
    : round2(coupon.value);

  const discountAmount = coupon.maxDiscountAmount != null
    ? Math.min(rawDiscount, coupon.maxDiscountAmount)
    : rawDiscount;

  return {
    valid: true,
    couponId: coupon._id.toString(),
    discountType: coupon.discountType,
    value: coupon.value,
    discountAmount,
    maxDiscountAmount: coupon.maxDiscountAmount ?? null,
  };
}

export async function createOrder(dto: CreateOrderDto, userId: string) {
  const { items: itemDtos, couponCode, ...rest } = dto;

  const productIds = [...new Set(itemDtos.map((i) => i.productId))];
  const products = await Product.find({ _id: { $in: productIds }, isActive: true });
  if (products.length !== productIds.length) {
    throw createError(400, 'VALIDATION_ERROR', 'One or more products not found or inactive');
  }

  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  for (const item of itemDtos) {
    if (!productMap.has(item.productId)) {
      throw createError(400, 'VALIDATION_ERROR', `Product ${item.productId} not found`);
    }
  }

  const items = itemDtos.map((item) => {
    const product = productMap.get(item.productId)!;
    const lineTotal = round2(product.price * item.quantity);
    return {
      productId: product._id.toString(),
      nameSnapshot: product.name,
      priceSnapshot: product.price,
      quantity: item.quantity,
      lineTotal,
    };
  });

  const computedSubtotal = round2(items.reduce((sum, i) => sum + i.lineTotal, 0));

  let discountAmount = 0;
  let couponId: string | null = null;

  if (couponCode) {
    const now = new Date();
    const coupon = await Coupon.findOne({
      code: couponCode,
      isEnabled: true,
      validFrom: { $lte: now },
      validUntil: { $gt: now },
    });
    if (!coupon) {
      throw createError(400, 'VALIDATION_ERROR', 'Invalid or expired coupon code');
    }
    if (coupon.minOrderAmount != null && computedSubtotal < coupon.minOrderAmount) {
      throw createError(
        400,
        'VALIDATION_ERROR',
        `This coupon requires a minimum order amount of ৳${coupon.minOrderAmount.toFixed(2)}`
      );
    }
    couponId = coupon._id.toString();

    const info = getDiscountInfo(coupon, computedSubtotal);
    discountAmount = info.discountAmount;
    couponId = info.couponId;
  }

  let manualDiscountAmount = 0;
  if (rest.discountPercent && rest.discountPercent > 0) {
    manualDiscountAmount = round2(computedSubtotal * (rest.discountPercent / 100));
    discountAmount = round2(discountAmount + manualDiscountAmount);
  }

  const categoryIds = [...new Set(products.map((p) => p.categoryId?.toString()).filter(Boolean))] as string[];
  const categories = categoryIds.length > 0 ? await Category.find({ _id: { $in: categoryIds } }) : [];
  const categoryMap = new Map(categories.map((c) => [c._id.toString(), c]));
  const categoryTaxMap = new Map(categories.map((c) => [c._id.toString(), c.vatRate]));
  const productCategoryMap = new Map<string, string>();
  for (const product of products) {
    const catId = product.categoryId?.toString();
    if (catId && categoryMap.has(catId)) {
      productCategoryMap.set(product._id.toString(), categoryMap.get(catId)!.name);
    } else {
      productCategoryMap.set(product._id.toString(), 'Uncategorized');
    }
  }
  const itemsWithCategory = items.map((item) => ({
    ...item,
    categorySnapshot: productCategoryMap.get(item.productId as string) || 'Uncategorized',
  }));
  const totalTaxAmount = round2(
    items.reduce((sum, item, idx) => {
      const product = productMap.get(itemDtos[idx].productId)!;
      const catId = product.categoryId?.toString();
      const vatRate = catId ? (categoryTaxMap.get(catId) ?? 0) : 0;
      return sum + round2(item.lineTotal * (vatRate / 100));
    }, 0)
  );
  discountAmount = Math.min(discountAmount, computedSubtotal);
  const grandTotal = round2(computedSubtotal - discountAmount);

  let tableLabelSnapshot: string | undefined;
  if (rest.tableId) {
    const table = await Table.findById(rest.tableId);
    if (!table) {
      throw createError(400, 'TABLE_NOT_FOUND', 'Referenced table not found');
    }
    tableLabelSnapshot = table.tableNumber;
  }

  const orderResult = await withTransaction(async (session) => {
    let resolvedCustomerId = rest.customerId || null;
    if (!resolvedCustomerId && rest.customerPhone) {
      const existing = await Customer.findOne({ phone: rest.customerPhone }, null, { session });
      if (existing) {
        const historyEntries: Array<{ field: string; oldValue: string; newValue: string; changedAt: Date }> = [];
        if (rest.customerName && existing.name !== rest.customerName) {
          historyEntries.push({ field: 'name', oldValue: existing.name, newValue: rest.customerName, changedAt: new Date() });
        }
        const update: Record<string, unknown> = { $inc: { orderCount: 1 } };
        if (rest.customerName) {
          (update as Record<string, unknown>).$set = { name: rest.customerName };
        }
        if (historyEntries.length > 0) {
          (update as Record<string, unknown>).$push = { history: { $each: historyEntries } };
        }
        await Customer.findByIdAndUpdate(existing._id, update, { session });
        resolvedCustomerId = existing._id.toString();
      } else {
        const customer = await Customer.create([{
          name: rest.customerName || rest.customerPhone,
          phone: rest.customerPhone,
          orderCount: 1,
          isActive: true,
        }], { session });
        resolvedCustomerId = customer[0]._id.toString();
      }
    }

    if (couponId) {
      const incremented = await Coupon.findOneAndUpdate(
        {
          _id: couponId,
          $expr: {
            $or: [
              { $eq: ['$usageLimit', null] },
              { $lt: ['$usageCount', '$usageLimit'] },
            ],
          },
        },
        { $inc: { usageCount: 1 } },
        { session, new: true }
      );

      if (!incremented) {
        throw createError(409, 'COUPON_USAGE_LIMIT_REACHED', 'Coupon usage limit reached');
      }
    }

    const seq = await getNextSequence('orderNumber', session);

    const padded = seq.toString().padStart(6, '0');
    const on = `ORD-${new Date().getFullYear()}-${padded}`;

    const order = await Order.create(
      [{
        orderNumber: on,
        orderType: rest.orderType || 'dine-in',
        tableId: rest.tableId || undefined,
        tableLabelSnapshot,
        customerId: resolvedCustomerId,
        customerName: rest.customerName,
        customerPhone: rest.customerPhone,
        servedBy: rest.servedBy || null,
        items: itemsWithCategory,
        couponId: couponId ?? undefined,
        discountPercent: rest.discountPercent || 0,
        discountAmount,
        taxAmount: totalTaxAmount,
        subtotal: computedSubtotal,
        grandTotal,
        status: 'pending',
        createdBy: userId,
      }],
      { session }
    );

    await ActivityLog.create(
      [{
        actor: userId,
        module: 'pos',
        action: 'pos.order_created',
        targetId: order[0]._id.toString(),
        targetType: 'Order',
        description: `Created order ${on} for ৳${grandTotal.toFixed(2)}, pending`,
      }],
      { session }
    );

    if (rest.tableId) {
      let bookedTable: { _id: unknown } | null = null;
      try {
        bookedTable = await Table.findByIdAndUpdate(
          { _id: rest.tableId, status: 'available' },
          { status: 'booked', currentOrderId: order[0]._id, bookedBy: 'order', bookedAt: new Date() },
          { session }
        );
      } catch (error) {
        if ((error as { codeName?: string }).codeName === 'WriteConflict') {
          throw createError(409, 'TABLE_ALREADY_BOOKED', 'This table is already booked by another active order');
        }
        throw error;
      }
      if (!bookedTable) {
        throw createError(409, 'TABLE_ALREADY_BOOKED', 'This table is already booked by another active order');
      }
    }

    return {
      orderNumber: on,
      orderId: order[0]._id.toString(),
      grandTotal,
      status: 'pending',
      createdBy: userId,
    };
  });

  try {
    const io = getIO();
    const payload = {
      orderId: orderResult.orderId,
      orderNumber: orderResult.orderNumber,
      grandTotal: orderResult.grandTotal,
      status: orderResult.status,
      createdBy: orderResult.createdBy,
    };
    io.to('room:orders').emit('pos:order_created', payload);
    io.to('room:orders').emit('order:created', payload);
    io.to('room:dashboard').emit('dashboard:metricsInvalidate');

    if (rest.tableId) {
      io.to('room:tables').emit('table:statusChanged', {
        tableId: rest.tableId,
        tableNumber: tableLabelSnapshot,
        status: 'booked',
        orderId: orderResult.orderId,
        source: 'order',
      });
    }
  } catch {
    // socket not available
  }

  return {
    id: orderResult.orderId,
    orderNumber: orderResult.orderNumber,
    orderType: rest.orderType || 'dine-in',
    tableId: rest.tableId || null,
    items: itemsWithCategory,
    subtotal: computedSubtotal,
    discountAmount,
    taxAmount: totalTaxAmount,
    grandTotal: orderResult.grandTotal,
    paymentStatus: 'unpaid',
    status: orderResult.status,
    createdBy: orderResult.createdBy,
  };
}

import Product from '../../models/Product';
import Category from '../../models/Category';
import Coupon from '../../models/Coupon';
import Customer from '../../models/Customer';
import Employee from '../../models/Employee';
import Order from '../../models/Order';
import ActivityLog from '../../models/ActivityLog';
import { withTransaction } from '../../lib/transaction';
import { getNextSequence } from '../../lib/counter';
import { createError } from '../../middleware/errorHandler';
import { getIO } from '../../config/socket';
import type { CreateOrderDto, CreateCustomerDto } from './pos.validation';
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

export async function getEmployees() {
  const employees = await Employee.find()
    .select('name')
    .sort({ name: 1 });

  return employees.map((e) => ({
    id: e._id.toString(),
    name: e.name,
  }));
}

export async function getCatalog() {
  const products = await Product.find({ isActive: true })
    .populate('categoryId', 'name taxRate')
    .sort({ name: 1 });

  return products.map((p) => ({
    id: p._id.toString(),
    name: p.name,
    price: p.price,
    image: p.image,
    category: p.categoryId ? (p.categoryId as unknown as { _id: string; name: string }).name : null,
    categoryId: p.categoryId ? (p.categoryId as unknown as { _id: string })._id.toString() : null,
    taxRate: p.categoryId ? (p.categoryId as unknown as { _id: string; taxRate: number }).taxRate ?? 0 : 0,
  }));
}

export async function getCouponDiscount(code: string) {
  const coupon = await Coupon.findOne({ code, isEnabled: true, validUntil: { $gt: new Date() } });
  if (!coupon) {
    throw createError(404, 'COUPON_NOT_FOUND', 'Invalid or expired coupon code');
  }
  return { type: coupon.discountType, value: coupon.value, couponId: coupon._id.toString() };
}

export async function lookupByPhone(phone: string) {
  const customer = await Customer.findOne({ phone });
  if (!customer) return null;
  return {
    id: customer._id.toString(),
    name: customer.name,
    phone: customer.phone,
    orderCount: customer.orderCount,
  };
}

export async function saveOrFindCustomer(dto: CreateCustomerDto) {
  let customer = await Customer.findOne({ phone: dto.phone });
  if (customer) {
    return { id: customer._id.toString(), name: customer.name, phone: customer.phone, created: false };
  }
  customer = await Customer.create({ ...dto, isActive: true });
  return { id: customer._id.toString(), name: customer.name, phone: customer.phone, created: true };
}

export async function createOrder(dto: CreateOrderDto, userId: string) {
  const { items: itemDtos, payment, couponCode, ...rest } = dto;
  const paymentMethod = payment.method;

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
      productId: product._id as unknown as string,
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
    const coupon = await Coupon.findOne({ code: couponCode, isEnabled: true, validUntil: { $gt: new Date() } });
    if (!coupon) {
      throw createError(400, 'VALIDATION_ERROR', 'Invalid or expired coupon code');
    }
    couponId = coupon._id.toString();

    if (coupon.usageLimit != null) {
      const usageCount = await Order.countDocuments({ couponId: coupon._id });
      if (usageCount >= coupon.usageLimit) {
        throw createError(400, 'VALIDATION_ERROR', 'Coupon usage limit reached');
      }
    }

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
  const categoryTaxMap = new Map(categories.map((c) => [c._id.toString(), c.taxRate]));
  const totalTaxAmount = round2(
    items.reduce((sum, item, idx) => {
      const product = productMap.get(itemDtos[idx].productId)!;
      const catId = product.categoryId?.toString();
      const taxRate = catId ? (categoryTaxMap.get(catId) ?? 0) : 0;
      return sum + round2(item.lineTotal * (taxRate / 100));
    }, 0)
  );
  const grandTotal = round2(computedSubtotal - discountAmount);

  let resolvedCustomerId = rest.customerId || null;
  if (!resolvedCustomerId && rest.customerPhone) {
    const existing = await Customer.findOne({ phone: rest.customerPhone });
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
      await Customer.findByIdAndUpdate(existing._id, update);
      resolvedCustomerId = existing._id.toString();
    } else {
      const customer = await Customer.create({
        name: rest.customerName || rest.customerPhone,
        phone: rest.customerPhone,
        orderCount: 1,
        isActive: true,
      });
      resolvedCustomerId = customer._id.toString();
    }
  }

  let cashTendered: number | undefined;
  let changeAmount: number | undefined;
  if (rest.cashTendered != null) {
    cashTendered = rest.cashTendered;
    changeAmount = round2(Math.max(0, cashTendered - grandTotal));
  }

  const orderNumber = await withTransaction(async (session) => {
    const seq = await getNextSequence('orderNumber', session);

    const padded = seq.toString().padStart(6, '0');
    const on = `ORD-${new Date().getFullYear()}-${padded}`;

    const order = await Order.create(
      [{
        orderNumber: on,
        orderType: rest.orderType || 'dine-in',
        tableNumber: rest.tableNumber,
        customerId: resolvedCustomerId,
        customerName: rest.customerName,
        customerPhone: rest.customerPhone,
        servedBy: rest.servedBy || null,
        items,
        couponId: couponId ?? undefined,
        discountPercent: rest.discountPercent || 0,
        discountAmount,
        taxAmount: totalTaxAmount,
        subtotal: computedSubtotal,
        grandTotal,
        cashTendered,
        changeAmount,
        payment: {
          method: paymentMethod,
          ...(dto.payment.transactionId ? { transactionId: dto.payment.transactionId } : {}),
        },
        status: rest.status || 'completed',
        createdBy: userId,
        ...(rest.status === 'completed' || !rest.status ? { completedAt: new Date() } : {}),
      }],
      { session }
    );

    if (couponId) {
      await Coupon.findByIdAndUpdate(couponId, { $inc: { usageCount: 1 } }, { session });
    }

    await ActivityLog.create(
      [{
        actor: userId,
        module: 'pos',
        action: 'pos.order_created',
        targetId: order[0]._id.toString(),
        targetType: 'Order',
        description: `Created order ${on} for BDT ${grandTotal.toFixed(2)} — ${paymentMethod}, ${rest.status || 'completed'}`,
      }],
      { session }
    );

    return on;
  });

  try {
    getIO().emit('pos:order_created', { orderNumber });
  } catch {
    // socket not available
  }

  return { orderNumber };
}

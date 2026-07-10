import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listOrdersQuerySchema,
  updateOrderSchema,
  updateOrderStatusSchema,
  billQuerySchema,
  orderIdParamSchema,
} from '../src/modules/orders/orders.validation';

// --- Validation Schema Tests ---

describe('listOrdersQuerySchema', () => {
  it('accepts empty query (defaults applied)', () => {
    const result = listOrdersQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
      expect(result.data.sort).toBe('-createdAt');
    }
  });

  it('accepts valid status filter', () => {
    const result = listOrdersQuerySchema.safeParse({ status: 'pending' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = listOrdersQuerySchema.safeParse({ status: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('accepts date range', () => {
    const result = listOrdersQuerySchema.safeParse({ from: '2026-06-01', to: '2026-06-15' });
    expect(result.success).toBe(true);
  });

  it('accepts valid ObjectId for createdBy', () => {
    const result = listOrdersQuerySchema.safeParse({ createdBy: '507f1f77bcf86cd799439011' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid ObjectId for createdBy', () => {
    const result = listOrdersQuerySchema.safeParse({ createdBy: 'not-an-id' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields via strict()', () => {
    const result = listOrdersQuerySchema.safeParse({ foo: 'bar' });
    expect(result.success).toBe(false);
  });

  it('rejects limit above 100', () => {
    const result = listOrdersQuerySchema.safeParse({ limit: 500 });
    expect(result.success).toBe(false);
  });

  it('rejects negative limit', () => {
    const result = listOrdersQuerySchema.safeParse({ limit: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects limit of 0', () => {
    const result = listOrdersQuerySchema.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects page > 1000', () => {
    const result = listOrdersQuerySchema.safeParse({ page: 1001 });
    expect(result.success).toBe(false);
  });

  it('rejects negative page', () => {
    const result = listOrdersQuerySchema.safeParse({ page: -5 });
    expect(result.success).toBe(false);
  });

  it('rejects search > 50 chars', () => {
    const result = listOrdersQuerySchema.safeParse({ search: 'a'.repeat(51) });
    expect(result.success).toBe(false);
  });

  it('accepts sort ascending', () => {
    const result = listOrdersQuerySchema.safeParse({ sort: 'createdAt' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid sort field', () => {
    const result = listOrdersQuerySchema.safeParse({ sort: 'orderNumber' });
    expect(result.success).toBe(false);
  });
});

describe('orderIdParamSchema', () => {
  it('accepts valid ObjectId', () => {
    const result = orderIdParamSchema.safeParse({ id: '507f1f77bcf86cd799439011' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid ObjectId', () => {
    const result = orderIdParamSchema.safeParse({ id: 'not-an-id' });
    expect(result.success).toBe(false);
  });

  it('rejects missing id', () => {
    const result = orderIdParamSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('updateOrderSchema', () => {
  it('accepts valid tableNumber update', () => {
    const result = updateOrderSchema.safeParse({ tableNumber: '12' });
    expect(result.success).toBe(true);
  });

  it('accepts customerId set to null (unlink)', () => {
    const result = updateOrderSchema.safeParse({ customerId: null });
    expect(result.success).toBe(true);
  });

  it('accepts customerId set to valid ObjectId', () => {
    const result = updateOrderSchema.safeParse({ customerId: '507f1f77bcf86cd799439011' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid customerId format', () => {
    const result = updateOrderSchema.safeParse({ customerId: 'bad' });
    expect(result.success).toBe(false);
  });

  it('rejects tableNumber > 20 chars', () => {
    const result = updateOrderSchema.safeParse({ tableNumber: 'a'.repeat(21) });
    expect(result.success).toBe(false);
  });

  it('accepts valid items array', () => {
    const result = updateOrderSchema.safeParse({
      items: [{ productId: '507f1f77bcf86cd799439011', quantity: 2 }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects items with negative quantity', () => {
    const result = updateOrderSchema.safeParse({
      items: [{ productId: '507f1f77bcf86cd799439011', quantity: -1 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects items with zero quantity', () => {
    const result = updateOrderSchema.safeParse({
      items: [{ productId: '507f1f77bcf86cd799439011', quantity: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty items array', () => {
    const result = updateOrderSchema.safeParse({ items: [] });
    expect(result.success).toBe(false);
  });

  it('accepts valid payment update', () => {
    const result = updateOrderSchema.safeParse({
      payment: { method: 'card' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects payment with invalid method', () => {
    const result = updateOrderSchema.safeParse({
      payment: { method: 'split' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects attempt to edit financial field (strict)', () => {
    const result = updateOrderSchema.safeParse({ grandTotal: 0 });
    expect(result.success).toBe(false);
  });

  it('accepts empty object (no-op)', () => {
    const result = updateOrderSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('updateOrderStatusSchema', () => {
  it('accepts pending -> completed', () => {
    const result = updateOrderStatusSchema.safeParse({ status: 'completed' });
    expect(result.success).toBe(true);
  });

  it('accepts pending -> cancelled with reason', () => {
    const result = updateOrderStatusSchema.safeParse({ status: 'cancelled', cancelReason: 'Customer request' });
    expect(result.success).toBe(true);
  });

  it('rejects cancelled without cancelReason', () => {
    const result = updateOrderStatusSchema.safeParse({ status: 'cancelled' });
    expect(result.success).toBe(false);
  });

  it('rejects cancelled with empty cancelReason', () => {
    const result = updateOrderStatusSchema.safeParse({ status: 'cancelled', cancelReason: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid status', () => {
    const result = updateOrderStatusSchema.safeParse({ status: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('rejects cancelReason > 500 chars', () => {
    const result = updateOrderStatusSchema.safeParse({ status: 'cancelled', cancelReason: 'a'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('rejects unknown field (strict)', () => {
    const result = updateOrderStatusSchema.safeParse({ status: 'completed', foo: 'bar' });
    expect(result.success).toBe(false);
  });
});

describe('billQuerySchema', () => {
  it('defaults to html format', () => {
    const result = billQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.format).toBe('html');
    }
  });

  it('accepts pdf format', () => {
    const result = billQuerySchema.safeParse({ format: 'pdf' });
    expect(result.success).toBe(true);
  });

  it('accepts html format', () => {
    const result = billQuerySchema.safeParse({ format: 'html' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid format', () => {
    const result = billQuerySchema.safeParse({ format: 'docx' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown field (strict)', () => {
    const result = billQuerySchema.safeParse({ format: 'html', foo: 'bar' });
    expect(result.success).toBe(false);
  });
});

// --- Service Helper Tests ---

import {
  formatBdt,
  escapeHtml,
  renderBillHtml,
  listOrders,
  getOrderById,
  updateOrder,
  updateOrderStatus,
  getOrderBill,
} from '../src/modules/orders/orders.service';
import Order from '../src/models/Order';
import Settings from '../src/models/Settings';
import Product from '../src/models/Product';
import Category from '../src/models/Category';
import ActivityLog from '../src/models/ActivityLog';

vi.mock('../src/models/Order');
vi.mock('../src/models/Product');
vi.mock('../src/models/Category');
vi.mock('../src/models/Settings');
vi.mock('../src/models/ActivityLog');
vi.mock('../src/config/socket', () => ({
  getIO: () => ({ emit: vi.fn() }),
}));
vi.mock('../src/lib/pdf', () => ({
  renderPdf: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4 mock')),
}));

describe('formatBdt', () => {
  it('formats with BDT symbol and 2 decimals', () => {
    expect(formatBdt(123.5)).toBe('\u09F3123.50');
  });

  it('handles zero', () => {
    expect(formatBdt(0)).toBe('\u09F30.00');
  });

  it('handles negative numbers', () => {
    expect(formatBdt(-10)).toBe('\u09F3-10.00');
  });
});

describe('escapeHtml', () => {
  it('escapes & < > " \'', () => {
    expect(escapeHtml('<script>"x&\'y"</script>')).toBe(
      '&lt;script&gt;&quot;x&amp;&#039;y&quot;&lt;/script&gt;'
    );
  });

  it('leaves safe strings unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });
});

describe('renderBillHtml', () => {
  const sampleOrder = {
    _id: '507f1f77bcf86cd799439011',
    orderNumber: 'ORD-000001',
    tableNumber: '5',
    items: [
      { nameSnapshot: 'Pasta', priceSnapshot: 12.5, quantity: 2, lineTotal: 25, productId: 'id' },
      { nameSnapshot: 'Juice', priceSnapshot: 3, quantity: 1, lineTotal: 3, productId: 'id2' },
    ],
    subtotal: 28,
    discountAmount: 2,
    taxAmount: 2.5,
    grandTotal: 28.5,
    cashTendered: 500,
    changeAmount: 471.5,
    payment: { method: 'cash' },
    paymentStatus: 'paid',
    status: 'completed',
    createdAt: new Date('2026-06-15T12:00:00Z'),
  };

  it('renders full HTML with items and totals', () => {
    const html = renderBillHtml(sampleOrder as never);
    expect(html).toContain('ORD-000001');
    expect(html).toContain('Pasta');
    expect(html).toContain('Juice');
    expect(html).toContain('\u09F328.00');
    expect(html).toContain('\u09F330.50');
    expect(html).toContain('\u09F326.00');
    expect(html).toContain('CASH');
    expect(html).toContain('Table');
    expect(html).toContain('5');
    expect(html).toContain('THANK YOU FOR VISITING');
    expect(html).toContain('Have a Wonderful Day!');
    expect(html).toContain('KITCHEN COPY');
  });

  it('includes VAT and combined Discount when taxAmount > 0', () => {
    const html = renderBillHtml(sampleOrder as never);
    expect(html).toContain('VAT');
    expect(html).toContain('\u09F32.50');
    expect(html).toContain('Subtotal + VAT');
    expect(html).toContain('Grand Total');
    expect(html).toContain('\u09F326.00');
    expect(html).toContain('-\u09F34.50');
  });

  it('omits VAT row when taxAmount is 0', () => {
    const noTax = { ...sampleOrder, taxAmount: 0 };
    const html = renderBillHtml(noTax as never);
    expect(html).not.toContain('>VAT<');
  });

  it('includes combined discount row when totalDiscount > 0', () => {
    const html = renderBillHtml(sampleOrder as never);
    expect(html).toContain('>Discount</span><span>');
    expect(html).toContain('-\u09F34.50');
  });

  it('shows combined discount as VAT amount when discountAmount is 0 but taxAmount > 0', () => {
    const noDiscount = { ...sampleOrder, discountAmount: 0 };
    const html = renderBillHtml(noDiscount as never);
    expect(html).toContain('>Discount</span><span>');
    expect(html).toContain('-\u09F32.50');
  });

  it('omits discount line when both discountAmount and taxAmount are 0', () => {
    const noDiscountNoTax = { ...sampleOrder, discountAmount: 0, taxAmount: 0 };
    const html = renderBillHtml(noDiscountNoTax as never);
    expect(html).not.toContain('>Discount</span><span>');
  });

  it('includes cancelled reason when status is cancelled', () => {
    const cancelled = {
      ...sampleOrder,
      status: 'cancelled',
      cancelReason: 'Customer changed mind',
    };
    const html = renderBillHtml(cancelled as never);
    expect(html).toContain('Customer changed mind');
  });

  it('includes customer name when present', () => {
    const withCustomer = {
      ...sampleOrder,
      customerId: { name: 'John Doe', phone: '01700000000' },
    };
    const html = renderBillHtml(withCustomer as never);
    expect(html).toContain('John Doe');
  });

  it('handles missing payment info gracefully', () => {
    const noPayment = { ...sampleOrder, payment: undefined, cashTendered: undefined, changeAmount: undefined };
    const html = renderBillHtml(noPayment as unknown as never);
    expect(html).toContain('THANK YOU FOR VISITING');
    expect(html).toContain('Have a Wonderful Day!');
  });

  it('includes cash tendered and change amount', () => {
    const html = renderBillHtml(sampleOrder as never);
    expect(html).toContain('Cash Tendered');
    expect(html).toContain('\u09F3500.00');
    expect(html).toContain('Returned');
    expect(html).toContain('\u09F3471.50');
  });

  it('includes auto-round when grand total is not round', () => {
    const nonRound = { ...sampleOrder, subtotal: 28.5, discountAmount: 0, taxAmount: 0, grandTotal: 28.5 };
    const html = renderBillHtml(nonRound as never);
    expect(html).toContain('Auto Round');
    expect(html).toContain('\u09F3-0.50');
  });

  it('includes settings data when provided', () => {
    const settings = {
      restaurantName: 'Test Cafe',
      address: '123 Main St',
      contactNumber: '01700000000',
      vatInfo: { bin: '123456789', mushak: 'Mushak-6.3' },
    };
    const html = renderBillHtml(sampleOrder as never, settings);
    expect(html).toContain('123 Main St');
    expect(html).toContain('01700000000');
    expect(html).toContain('BIN: 123456789');
    expect(html).toContain('Mushak-6.3');
    expect(html).toContain('Test Cafe');
  });

  it('renders kitchen copy with items and quantity', () => {
    const withServer = {
      ...sampleOrder,
      servedBy: { name: 'Alice' },
      createdBy: { name: 'Bob' },
    };
    const html = renderBillHtml(withServer as never);
    expect(html).toContain('KITCHEN COPY');
    expect(html).toContain('Pasta');
    expect(html).toContain('Juice');
    expect(html).toContain('Alice');
    expect(html).toContain('Invoice');
    expect(html).toContain('ORD-000001');
    expect(html).toContain('5');
  });
});

// --- Service Function Tests ---

describe('listOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds correct filter for status', async () => {
    vi.mocked(Order.find).mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    } as never);
    vi.mocked(Order.countDocuments).mockResolvedValue(0 as never);

    await listOrders({ status: 'pending', page: 1, limit: 20, sort: '-createdAt' });

    expect(Order.find).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending' }),
      expect.any(Object)
    );
  });

  it('builds date range filter', async () => {
    vi.mocked(Order.find).mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    } as never);
    vi.mocked(Order.countDocuments).mockResolvedValue(0 as never);

    await listOrders({ from: '2026-06-01', to: '2026-06-15', page: 1, limit: 20, sort: '-createdAt' });

    const findCall = vi.mocked(Order.find).mock.calls[0][0] as Record<string, unknown>;
    expect(findCall.createdAt).toBeDefined();
    const dateFilter = findCall.createdAt as Record<string, Date>;
    expect(dateFilter.$gte).toBeDefined();
    expect(dateFilter.$lte).toBeDefined();
  });

  it('builds search filter', async () => {
    vi.mocked(Order.find).mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    } as never);
    vi.mocked(Order.countDocuments).mockResolvedValue(0 as never);

    await listOrders({ search: 'ORD-001', page: 1, limit: 20, sort: '-createdAt' });

    const findCall = vi.mocked(Order.find).mock.calls[0][0] as Record<string, unknown>;
    expect(findCall.orderNumber).toBeDefined();
    expect((findCall.orderNumber as Record<string, unknown>).$regex).toBeDefined();
  });
});

describe('getOrderById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns order when found', async () => {
    vi.mocked(Order.findById).mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        orderNumber: 'ORD-000001',
        items: [],
        subtotal: 0,
        discountAmount: 0,
        taxAmount: 0,
        grandTotal: 0,
        payment: { method: 'cash' },
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    } as never);

    const result = await getOrderById('507f1f77bcf86cd799439011');
    expect(result.data).toBeDefined();
    expect(result.data.orderNumber).toBe('ORD-000001');
  });

  it('throws 404 when not found', async () => {
    vi.mocked(Order.findById).mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(null),
    } as never);

    try {
      await getOrderById('507f1f77bcf86cd799439011');
      expect.unreachable('Expected error');
    } catch (err) {
      const appErr = err as { statusCode: number; code: string };
      expect(appErr.statusCode).toBe(404);
      expect(appErr.code).toBe('NOT_FOUND');
    }
  });
});

describe('updateOrder', () => {
  const mockExistingOrder = {
    _id: '507f1f77bcf86cd799439011',
    orderNumber: 'ORD-000001',
    status: 'pending',
    tableNumber: '5',
    items: [{ productId: 'id1', nameSnapshot: 'Pasta', priceSnapshot: 12, quantity: 2, lineTotal: 24 }],
    subtotal: 24,
    discountAmount: 0,
    taxAmount: 0,
    grandTotal: 24,
    couponId: null,
    payment: { method: 'cash' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates table number', async () => {
    vi.mocked(Order.findById).mockResolvedValueOnce({ ...mockExistingOrder } as never);
    vi.mocked(Order.findByIdAndUpdate).mockResolvedValueOnce({
      ...mockExistingOrder,
      tableNumber: '12',
    } as never);
    vi.mocked(Order.findById).mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({ ...mockExistingOrder, tableNumber: '12' }),
    } as never);

    const result = await updateOrder('507f1f77bcf86cd799439011', { tableNumber: '12' });

    expect(Order.findByIdAndUpdate).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      { $set: expect.objectContaining({ tableNumber: '12' }) },
      expect.objectContaining({ new: true, runValidators: true })
    );
    expect(result.data).toBeDefined();
  });

  it('updates payment method', async () => {
    vi.mocked(Order.findById).mockResolvedValueOnce({ ...mockExistingOrder } as never);
    vi.mocked(Order.findByIdAndUpdate).mockResolvedValueOnce({
      ...mockExistingOrder,
      payment: { method: 'card' },
    } as never);
    vi.mocked(Order.findById).mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({ ...mockExistingOrder, payment: { method: 'card' } }),
    } as never);

    const result = await updateOrder('507f1f77bcf86cd799439011', {
      payment: { method: 'card' },
    });

    expect(Order.findByIdAndUpdate).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      { $set: expect.objectContaining({ 'payment.method': 'card' }) },
      expect.any(Object)
    );
    expect(result.data).toBeDefined();
  });

  it('updates items and recalculates totals', async () => {
    vi.mocked(Order.findById).mockResolvedValueOnce({ ...mockExistingOrder } as never);
    vi.mocked(Product.find).mockResolvedValueOnce([
      { _id: { toString: () => 'pid-1' }, name: 'Pasta', price: 12, categoryId: { toString: () => 'cat-1' } },
      { _id: { toString: () => 'pid-2' }, name: 'Juice', price: 3, categoryId: { toString: () => 'cat-2' } },
    ] as never);
    vi.mocked(Category.find).mockResolvedValueOnce([
      { _id: { toString: () => 'cat-1' }, vatRate: 5 },
      { _id: { toString: () => 'cat-2' }, vatRate: 5 },
    ] as never);
    vi.mocked(Order.findByIdAndUpdate).mockResolvedValueOnce({ ...mockExistingOrder } as never);
    vi.mocked(Order.findById).mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({ ...mockExistingOrder }),
    } as never);

    const result = await updateOrder('507f1f77bcf86cd799439011', {
      items: [
        { productId: 'pid-1', quantity: 2 },
        { productId: 'pid-2', quantity: 3 },
      ],
    });

    expect(Product.find).toHaveBeenCalled();
    expect(Category.find).toHaveBeenCalled();
    expect(Order.findByIdAndUpdate).toHaveBeenCalled();
    expect(result.data).toBeDefined();
  });

  it('allows item editing on completed orders', async () => {
    vi.mocked(Order.findById).mockResolvedValueOnce({ ...mockExistingOrder, status: 'completed' } as never);
    vi.mocked(Product.find).mockResolvedValueOnce([
      { _id: { toString: () => 'pid-1' }, name: 'Product 1', price: 10, categoryId: { toString: () => 'cat-1' } },
    ] as never);
    vi.mocked(Category.find).mockResolvedValueOnce([
      { _id: { toString: () => 'cat-1' }, vatRate: 5 },
    ] as never);
    vi.mocked(Order.findByIdAndUpdate).mockResolvedValueOnce({ ...mockExistingOrder } as never);
    vi.mocked(Order.findById).mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({ ...mockExistingOrder, status: 'completed' }),
    } as never);

    const result = await updateOrder('507f1f77bcf86cd799439011', {
      items: [{ productId: 'pid-1', quantity: 2 }],
    });

    expect(Product.find).toHaveBeenCalled();
    expect(Category.find).toHaveBeenCalled();
    expect(Order.findByIdAndUpdate).toHaveBeenCalled();
    expect(result.data).toBeDefined();
  });

  it('rejects items with inactive/missing products', async () => {
    vi.mocked(Order.findById).mockResolvedValueOnce({ ...mockExistingOrder } as never);
    vi.mocked(Product.find).mockResolvedValueOnce([] as never);

    try {
      await updateOrder('507f1f77bcf86cd799439011', {
        items: [{ productId: 'nonexistent', quantity: 2 }],
      });
      expect.unreachable('Expected error');
    } catch (err) {
      const appErr = err as { statusCode: number; code: string };
      expect(appErr.statusCode).toBe(400);
    }
  });

  it('throws 404 when order not found', async () => {
    vi.mocked(Order.findById).mockResolvedValueOnce(null as never);

    try {
      await updateOrder('507f1f77bcf86cd799439011', { tableNumber: '12' });
      expect.unreachable('Expected error');
    } catch (err) {
      const appErr = err as { statusCode: number; code: string };
      expect(appErr.statusCode).toBe(404);
      expect(appErr.code).toBe('NOT_FOUND');
    }
  });
});

describe('updateOrderStatus', () => {
  const mockOrder = {
    _id: '507f1f77bcf86cd799439011',
    orderNumber: 'ORD-000001',
    status: 'pending',
    items: [],
    subtotal: 0,
    discountAmount: 0,
    taxAmount: 0,
    grandTotal: 0,
    payment: { method: 'cash' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('completes a pending order', async () => {
    vi.mocked(Order.findById).mockResolvedValueOnce({ ...mockOrder } as never);
    vi.mocked(Order.findByIdAndUpdate).mockResolvedValueOnce({
      ...mockOrder,
      status: 'completed',
      completedAt: new Date(),
    } as never);
    vi.mocked(Order.findById).mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({ ...mockOrder, status: 'completed', completedAt: new Date() }),
    } as never);

    const result = await updateOrderStatus('507f1f77bcf86cd799439011', { status: 'completed' });
    expect(result.data).toBeDefined();
    expect(Order.findByIdAndUpdate).toHaveBeenCalled();
  });

  it('cancels a pending order with reason', async () => {
    vi.mocked(Order.findById).mockResolvedValueOnce({ ...mockOrder } as never);
    vi.mocked(Order.findByIdAndUpdate).mockResolvedValueOnce({
      ...mockOrder,
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelReason: 'Customer request',
    } as never);
    vi.mocked(Order.findById).mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({ ...mockOrder, status: 'cancelled', cancelledAt: new Date(), cancelReason: 'Customer request' }),
    } as never);

    const result = await updateOrderStatus('507f1f77bcf86cd799439011', { status: 'cancelled', cancelReason: 'Customer request' });
    expect(result.data).toBeDefined();
  });

  it('rejects invalid transition cancelled -> completed', async () => {
    vi.mocked(Order.findById).mockResolvedValueOnce({ ...mockOrder, status: 'cancelled' } as never);

    try {
      await updateOrderStatus('507f1f77bcf86cd799439011', { status: 'completed' });
      expect.unreachable('Expected error');
    } catch (err) {
      const appErr = err as { statusCode: number; code: string };
      expect(appErr.statusCode).toBe(400);
      expect(appErr.code).toBe('VALIDATION_ERROR');
    }
  });

  it('rejects invalid transition completed -> pending', async () => {
    vi.mocked(Order.findById).mockResolvedValueOnce({ ...mockOrder, status: 'completed' } as never);

    try {
      await updateOrderStatus('507f1f77bcf86cd799439011', { status: 'pending' });
      expect.unreachable('Expected error');
    } catch (err) {
      const appErr = err as { statusCode: number; code: string };
      expect(appErr.statusCode).toBe(400);
      expect(appErr.code).toBe('VALIDATION_ERROR');
    }
  });

  it('rejects cancelled without reason in service (defensive)', async () => {
    vi.mocked(Order.findById).mockResolvedValueOnce({ ...mockOrder } as never);

    try {
      await updateOrderStatus('507f1f77bcf86cd799439011', { status: 'cancelled' } as never);
      expect.unreachable('Expected error');
    } catch (err) {
      const appErr = err as { statusCode: number; code: string };
      expect(appErr.statusCode).toBe(400);
    }
  });

  it('throws 404 when order not found', async () => {
    vi.mocked(Order.findById).mockResolvedValueOnce(null as never);

    try {
      await updateOrderStatus('507f1f77bcf86cd799439011', { status: 'completed' });
      expect.unreachable('Expected error');
    } catch (err) {
      const appErr = err as { statusCode: number; code: string };
      expect(appErr.statusCode).toBe(404);
    }
  });
});

describe('getOrderBill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Settings.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: 'restaurant-settings',
        restaurantName: 'Test Restaurant',
        address: '',
        contactNumber: '',
        logo: { url: '', publicId: '' },
        vatInfo: { bin: '', mushak: '' },
      }),
    } as never);
  });

  it('returns HTML when format is html', async () => {
    vi.mocked(Order.findById).mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        orderNumber: 'ORD-000001',
        items: [],
        subtotal: 0,
        discountAmount: 0,
        taxAmount: 0,
        grandTotal: 0,
        payment: { method: 'cash' },
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    } as never);

    const result = await getOrderBill('507f1f77bcf86cd799439011', 'html');
    expect(result.data).toBeDefined();
    expect(result.data.html).toContain('ORD-000001');
  });

  it('returns PDF when format is pdf', async () => {
    vi.mocked(Order.findById).mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        orderNumber: 'ORD-000001',
        items: [],
        subtotal: 0,
        discountAmount: 0,
        taxAmount: 0,
        grandTotal: 0,
        payment: { method: 'cash' },
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    } as never);

    const result = await getOrderBill('507f1f77bcf86cd799439011', 'pdf');
    expect(result.pdf).toBeDefined();
    expect(result.filename).toContain('ORD-000001');
  });

  it('throws 404 when order not found', async () => {
    vi.mocked(Order.findById).mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(null),
    } as never);

    try {
      await getOrderBill('507f1f77bcf86cd799439011', 'html');
      expect.unreachable('Expected error');
    } catch (err) {
      const appErr = err as { statusCode: number; code: string };
      expect(appErr.statusCode).toBe(404);
      expect(appErr.code).toBe('NOT_FOUND');
    }
  });
});

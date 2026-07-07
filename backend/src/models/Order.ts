import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  nameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  lineTotal: number;
}

export interface IPayment {
  method: 'cash' | 'card' | 'bkash' | 'nagad';
  transactionId?: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  orderType: 'dine-in' | 'takeaway' | 'delivery';
  tableNumber?: string;
  customerId?: mongoose.Types.ObjectId | null;
  customerName?: string;
  customerPhone?: string;
  servedBy?: mongoose.Types.ObjectId | null;
  items: IOrderItem[];
  couponId?: mongoose.Types.ObjectId | null;
  discountPercent: number;
  discountAmount: number;
  taxAmount: number;
  subtotal: number;
  grandTotal: number;
  cashTendered?: number;
  changeAmount?: number;
  payment: IPayment;
  status: 'pending' | 'completed' | 'cancelled';
  createdBy: mongoose.Types.ObjectId;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    method: {
      type: String,
      required: true,
      enum: ['cash', 'card', 'bkash', 'nagad'],
    },
    transactionId: { type: String, required: false },
  },
  { _id: false }
);

const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    nameSnapshot: { type: String, required: true },
    priceSnapshot: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true },
  }
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    orderType: {
      type: String,
      required: true,
      enum: ['dine-in', 'takeaway', 'delivery'],
    },
    tableNumber: { type: String, required: false },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: false, default: null },
    customerName: { type: String, required: false },
    customerPhone: { type: String, required: false },
    servedBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: false, default: null },
    items: { type: [orderItemSchema], required: true, validate: [(v: IOrderItem[]) => v.length > 0, 'Order must have at least one item'] },
    couponId: { type: Schema.Types.ObjectId, ref: 'Coupon', required: false, default: null },
    discountPercent: { type: Number, required: true, default: 0 },
    discountAmount: { type: Number, required: true, default: 0 },
    taxAmount: { type: Number, required: true, default: 0 },
    subtotal: { type: Number, required: true },
    grandTotal: { type: Number, required: true },
    cashTendered: { type: Number, required: false },
    changeAmount: { type: Number, required: false },
    payment: { type: paymentSchema, required: true },
    status: {
      type: String,
      default: 'pending',
      enum: ['pending', 'completed', 'cancelled'],
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    completedAt: { type: Date, required: false },
    cancelledAt: { type: Date, required: false },
    cancelReason: { type: String, required: false },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ customerId: 1 });
orderSchema.index({ createdBy: 1 });
orderSchema.index({ 'items.productId': 1 });

const Order = mongoose.model<IOrder>('Order', orderSchema);

export default Order;

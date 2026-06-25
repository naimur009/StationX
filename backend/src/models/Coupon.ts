import mongoose, { Schema, Document } from 'mongoose';

export interface ICoupon extends Document {
  code: string;
  discountType: 'flat' | 'percentage';
  value: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  validFrom: Date;
  validUntil: Date;
  isEnabled: boolean;
  usageLimit?: number;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountType: { type: String, required: true, enum: ['flat', 'percentage'] },
    value: { type: Number, required: true },
    maxDiscountAmount: { type: Number, required: false },
    minOrderAmount: { type: Number, required: false },
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    isEnabled: { type: Boolean, default: true },
    usageLimit: { type: Number, required: false },
    usageCount: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

couponSchema.index({ code: 1 }, { unique: true });
couponSchema.index({ isEnabled: 1, validUntil: 1 });

const Coupon = mongoose.model<ICoupon>('Coupon', couponSchema);

export default Coupon;

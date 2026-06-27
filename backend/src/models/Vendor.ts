import mongoose, { Schema, Document } from 'mongoose';

export interface IVendor extends Document {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  itemsSupplied: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const vendorSchema = new Schema<IVendor>(
  {
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    itemsSupplied: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

vendorSchema.index({ name: 1 });
vendorSchema.index({ isActive: 1 });

const Vendor = mongoose.model<IVendor>('Vendor', vendorSchema);

export default Vendor;

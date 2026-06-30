import mongoose, { Schema, Document } from 'mongoose';

export interface IHistoryEntry {
  field: string;
  oldValue: string;
  newValue: string;
  changedAt: Date;
}

export interface ICustomer extends Document {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  isActive: boolean;
  orderCount: number;
  history: IHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const historyEntrySchema = new Schema<IHistoryEntry>(
  {
    field: { type: String, required: true },
    oldValue: { type: String, required: true },
    newValue: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const customerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    orderCount: { type: Number, default: 0 },
    history: { type: [historyEntrySchema], default: [] },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

customerSchema.index({ phone: 1 });
customerSchema.index({ name: 'text' });

const Customer = mongoose.model<ICustomer>('Customer', customerSchema);

export default Customer;

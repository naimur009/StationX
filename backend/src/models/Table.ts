import mongoose, { Schema, Document } from 'mongoose';

export interface ITable extends Document {
  tableNumber: string;
  capacity?: number;
  status: 'available' | 'booked';
  currentOrderId?: mongoose.Types.ObjectId | null;
  bookedBy?: 'order' | 'manual' | null;
  bookedAt?: Date | null;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const tableSchema = new Schema<ITable>(
  {
    tableNumber: { type: String, required: true, unique: true, trim: true },
    capacity: { type: Number, required: false },
    status: { type: String, enum: ['available', 'booked'], default: 'available', required: true },
    currentOrderId: { type: Schema.Types.ObjectId, ref: 'Order', required: false, default: null },
    bookedBy: { type: String, enum: ['order', 'manual', null], required: false, default: null },
    bookedAt: { type: Date, required: false, default: null },
    notes: { type: String, required: false },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

tableSchema.index({ status: 1 });

const Table = mongoose.model<ITable>('Table', tableSchema);

export default Table;

import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IIncome extends Document {
  amount: number;
  date: Date;
  description: string;
  category: string;
  receivedFrom: string;
  receivedBy: Types.ObjectId;
  paymentMethod: 'cash' | 'card' | 'bkash' | 'nagad';
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const incomeSchema = new Schema<IIncome>(
  {
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    description: { type: String, trim: true, maxlength: 500 },
    category: { type: String, required: true, trim: true, maxlength: 100 },
    receivedFrom: { type: String, required: true, trim: true, maxlength: 200 },
    receivedBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'bkash', 'nagad'],
      required: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

incomeSchema.index({ date: -1 });
incomeSchema.index({ category: 1 });
incomeSchema.index({ receivedBy: 1 });

const Income = mongoose.model<IIncome>('Income', incomeSchema);

export default Income;

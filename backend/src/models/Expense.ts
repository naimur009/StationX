import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IExpense extends Document {
  amount: number;
  date: Date;
  description: string;
  category: string;
  vendorId?: Types.ObjectId;
  paidBy: Types.ObjectId;
  paidTo: string;
  paymentMethod: 'cash' | 'card' | 'bkash' | 'nagad';
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    category: { type: String, required: true, trim: true, maxlength: 100 },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' },
    paidBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    paidTo: { type: String, required: true, trim: true, maxlength: 200 },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'bkash', 'nagad'],
      required: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ vendorId: 1 });
expenseSchema.index({ paidBy: 1 });

const Expense = mongoose.model<IExpense>('Expense', expenseSchema);

export default Expense;

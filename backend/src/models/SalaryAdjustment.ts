import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISalaryAdjustment extends Document {
  employeeId: Types.ObjectId;
  salaryId?: Types.ObjectId;
  type: 'bonus' | 'cut';
  amount: number;
  reason: string;
  date: Date;
  month: number;
  year: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const salaryAdjustmentSchema = new Schema<ISalaryAdjustment>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    salaryId: { type: Schema.Types.ObjectId, ref: 'Salary' },
    type: {
      type: String,
      enum: ['bonus', 'cut'],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, trim: true, maxlength: 300 },
    date: { type: Date, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

salaryAdjustmentSchema.index({ employeeId: 1, month: 1, year: 1 });
salaryAdjustmentSchema.index({ salaryId: 1 });
salaryAdjustmentSchema.index({ type: 1 });

const SalaryAdjustment = mongoose.model<ISalaryAdjustment>('SalaryAdjustment', salaryAdjustmentSchema);

export default SalaryAdjustment;

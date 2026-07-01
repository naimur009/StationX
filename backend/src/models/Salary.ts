import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISalaryAdvance {
  amount: number;
  date: Date;
  note?: string;
  createdBy: Types.ObjectId;
}

export interface ISalary extends Document {
  employeeId: Types.ObjectId;
  baseSalary: number;
  month: number;
  year: number;
  advances: ISalaryAdvance[];
  status: 'active' | 'paid' | 'cancelled';
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const advanceSchema = new Schema<ISalaryAdvance>(
  {
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    note: { type: String, trim: true, maxlength: 300 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: true }
);

const salarySchema = new Schema<ISalary>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    baseSalary: { type: Number, required: true, min: 0 },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    advances: { type: [advanceSchema], default: [] },
    status: {
      type: String,
      enum: ['active', 'paid', 'cancelled'],
      default: 'active',
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

salarySchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });
salarySchema.index({ month: 1, year: 1 });
salarySchema.index({ status: 1 });

const Salary = mongoose.model<ISalary>('Salary', salarySchema);

export default Salary;

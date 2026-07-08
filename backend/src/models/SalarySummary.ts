import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISalarySummary extends Document {
  employeeId: Types.ObjectId;
  month: number;
  year: number;
  totalSalary: number;
  totalBonus: number;
  totalCut: number;
  totalPaid: number;
  netSalary: number;
  createdAt: Date;
  updatedAt: Date;
}

const salarySummarySchema = new Schema<ISalarySummary>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    totalSalary: { type: Number, default: 0, min: 0 },
    totalBonus: { type: Number, default: 0, min: 0 },
    totalCut: { type: Number, default: 0, min: 0 },
    totalPaid: { type: Number, default: 0, min: 0 },
    netSalary: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

salarySummarySchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });
salarySummarySchema.index({ month: 1, year: 1 });

const SalarySummary = mongoose.model<ISalarySummary>('SalarySummary', salarySummarySchema);

export default SalarySummary;

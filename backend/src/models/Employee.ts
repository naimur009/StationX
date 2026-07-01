import mongoose, { Schema, Document } from 'mongoose';

export interface IEmployee extends Document {
  name: string;
  phone: string;
  address: string;
  baseSalary: number;
  createdAt: Date;
  updatedAt: Date;
}

const employeeSchema = new Schema<IEmployee>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, default: '', trim: true },
    baseSalary: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

employeeSchema.index({ name: 1 });

const Employee = mongoose.model<IEmployee>('Employee', employeeSchema);

export default Employee;

import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  taxRate: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    taxRate: { type: Number, default: 5, min: 0, max: 100 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

categorySchema.index({ name: 'text' });
categorySchema.index({ isActive: 1 });

const Category = mongoose.model<ICategory>('Category', categorySchema);

export default Category;

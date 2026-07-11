import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  vatRate: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    vatRate: { type: Number, required: true, min: 0, max: 100 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

categorySchema.index({ isActive: 1 });

const Category = mongoose.model<ICategory>('Category', categorySchema);

export default Category;

import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  price: number;
  categoryId: mongoose.Types.ObjectId;
  image?: { url: string; publicId: string };
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productImageSchema = new Schema(
  { url: { type: String }, publicId: { type: String } },
  { _id: false }
);

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    image: { type: productImageSchema, required: false },
    description: { type: String, required: false, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

productSchema.index({ categoryId: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ name: 'text' });

const Product = mongoose.model<IProduct>('Product', productSchema);

export default Product;

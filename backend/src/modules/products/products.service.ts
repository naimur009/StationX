import Product, { IProduct } from '../../models/Product';
import Category from '../../models/Category';
import { deleteFromCloudinary } from '../../lib/upload';
import { createError } from '../../middleware/errorHandler';
import type {
  CreateProductDto,
  UpdateProductDto,
  ListProductsDto,
} from './products.validation';

interface ProductResponse {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  categoryName: string | null;
  image: { url: string; publicId: string } | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function toProductResponse(product: IProduct): ProductResponse {
  const categoryRaw = product.categoryId as unknown as { _id: string; name: string } | string;
  const categoryId = typeof categoryRaw === 'object' ? categoryRaw._id.toString() : categoryRaw.toString();
  const categoryName = typeof categoryRaw === 'object' ? categoryRaw.name : null;

  return {
    id: product._id.toString(),
    name: product.name,
    price: product.price,
    categoryId,
    categoryName,
    image: product.image || null,
    description: product.description || null,
    isActive: product.isActive,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export async function listProducts(query: ListProductsDto) {
  const filter: Record<string, unknown> = {};

  if (query.isActive === 'true') {
    filter.isActive = true;
  } else if (query.isActive === 'false') {
    filter.isActive = false;
  }

  if (query.categoryId) {
    filter.categoryId = query.categoryId;
  }

  if (query.search) {
    filter.name = { $regex: query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }

  const skip = (query.page - 1) * query.limit;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('categoryId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit),
    Product.countDocuments(filter),
  ]);

  return {
    data: products.map(toProductResponse),
    meta: { total, page: query.page, limit: query.limit },
  };
}

export async function getProductById(id: string) {
  const product = await Product.findById(id).populate('categoryId', 'name');

  if (!product) {
    throw createError(404, 'NOT_FOUND', 'Product not found');
  }

  return toProductResponse(product);
}

export async function createProduct(dto: CreateProductDto) {
  const category = await Category.findById(dto.categoryId);
  if (!category) {
    throw createError(400, 'INVALID_CATEGORY', 'Category not found');
  }
  const product = await Product.create({
    name: dto.name,
    price: dto.price,
    categoryId: dto.categoryId,
    image: dto.image,
    description: dto.description,
    isActive: true,
  });

  const populated = await product.populate('categoryId', 'name');

  return toProductResponse(populated);
}

export async function updateProduct(id: string, dto: UpdateProductDto) {
  const product = await Product.findById(id);

  if (!product) {
    throw createError(404, 'NOT_FOUND', 'Product not found');
  }

  if (dto.categoryId !== undefined && dto.categoryId !== product.categoryId.toString()) {
    const category = await Category.findById(dto.categoryId);
    if (!category) {
      throw createError(400, 'INVALID_CATEGORY', 'Category not found');
    }
  }

  if (dto.image === null && product.image?.publicId) {
    deleteFromCloudinary(product.image.publicId).catch(() => {});
  } else if (dto.image && dto.image.publicId !== product.image?.publicId) {
    if (product.image?.publicId) {
      deleteFromCloudinary(product.image.publicId).catch(() => {});
    }
  }

  const updates: Record<string, unknown> = {};
  if (dto.name !== undefined) updates.name = dto.name;
  if (dto.price !== undefined) updates.price = dto.price;
  if (dto.categoryId !== undefined) updates.categoryId = dto.categoryId;
  if (dto.image !== undefined) updates.image = dto.image;
  if (dto.description !== undefined) updates.description = dto.description;
  if (dto.isActive !== undefined) updates.isActive = dto.isActive;

  const updated = await Product.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true }
  ).populate('categoryId', 'name');

  if (!updated) {
    throw createError(404, 'NOT_FOUND', 'Product not found');
  }

  return toProductResponse(updated);
}

export async function deleteProduct(id: string) {
  const product = await Product.findByIdAndUpdate(
    id,
    { $set: { isActive: false } },
    { new: true }
  );

  if (!product) {
    throw createError(404, 'NOT_FOUND', 'Product not found');
  }

  return { success: true };
}

export async function permanentDeleteProduct(id: string) {
  const product = await Product.findById(id);

  if (!product) {
    throw createError(404, 'NOT_FOUND', 'Product not found');
  }

  if (product.isActive) {
    throw createError(400, 'PRODUCT_IS_ACTIVE', 'Deactivate the product first before permanent deletion');
  }

  // TODO: When Orders module is implemented, check that no OrderItem references
  // this productId before allowing hard delete. See DATABASE.md §3.8 — OrderItems
  // embed productId as a reference retained for reporting joins, and removing the
  // product would orphan that reference.
  //   const orderCount = await Order.countDocuments({ 'items.productId': id });
  //   if (orderCount > 0) {
  //     throw createError(409, 'PRODUCT_IN_USE', 'Cannot delete product referenced by orders');
  //   }

  if (product.image?.publicId) {
    deleteFromCloudinary(product.image.publicId).catch(() => {});
  }

  await Product.findByIdAndDelete(id);

  return { success: true };
}

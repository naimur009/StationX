import Category, { ICategory } from '../../models/Category';
import Product from '../../models/Product';
import { createError } from '../../middleware/errorHandler';
import type {
  CreateCategoryDto,
  UpdateCategoryDto,
  ListCategoriesDto,
} from './categories.validation';

interface CategoryResponse {
  id: string;
  name: string;
  isActive: boolean;
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
}

async function toCategoryResponse(category: ICategory): Promise<CategoryResponse> {
  const productCount = await Product.countDocuments({ categoryId: category._id });
  return {
    id: category._id.toString(),
    name: category.name,
    isActive: category.isActive,
    productCount,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

export async function listCategories(query: ListCategoriesDto) {
  const filter: Record<string, unknown> = {};

  if (query.isActive === 'true') {
    filter.isActive = true;
  } else if (query.isActive === 'false') {
    filter.isActive = false;
  }

  if (query.search) {
    filter.name = { $regex: query.search, $options: 'i' };
  }

  const skip = (query.page - 1) * query.limit;

  const [categories, total] = await Promise.all([
    Category.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    Category.countDocuments(filter),
  ]);

  return {
    data: await Promise.all(categories.map(toCategoryResponse)),
    meta: { total, page: query.page, limit: query.limit },
  };
}

export async function getCategoryById(id: string) {
  const category = await Category.findById(id);

  if (!category) {
    throw createError(404, 'NOT_FOUND', 'Category not found');
  }

  return await toCategoryResponse(category);
}

export async function createCategory(dto: CreateCategoryDto) {
  const existing = await Category.findOne({ name: dto.name });
  if (existing) {
    throw createError(400, 'VALIDATION_ERROR', 'A category with this name already exists');
  }

  const category = await Category.create({
    name: dto.name,
    isActive: true,
  });

  return await toCategoryResponse(category);
}

export async function updateCategory(id: string, dto: UpdateCategoryDto) {
  const category = await Category.findById(id);

  if (!category) {
    throw createError(404, 'NOT_FOUND', 'Category not found');
  }

  if (dto.name !== undefined && dto.name !== category.name) {
    const existing = await Category.findOne({ name: dto.name, _id: { $ne: id } });
    if (existing) {
      throw createError(400, 'VALIDATION_ERROR', 'A category with this name already exists');
    }
  }

  const updates: Record<string, unknown> = {};
  if (dto.name !== undefined) updates.name = dto.name;
  if (dto.isActive !== undefined) updates.isActive = dto.isActive;

  const updated = await Category.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!updated) {
    throw createError(404, 'NOT_FOUND', 'Category not found');
  }

  return await toCategoryResponse(updated);
}

export async function deleteCategory(id: string) {
  const category = await Category.findByIdAndUpdate(
    id,
    { $set: { isActive: false } },
    { new: true }
  );

  if (!category) {
    throw createError(404, 'NOT_FOUND', 'Category not found');
  }

  return { success: true };
}

export async function permanentDeleteCategory(id: string) {
  const category = await Category.findById(id);

  if (!category) {
    throw createError(404, 'NOT_FOUND', 'Category not found');
  }

  const productCount = await Product.countDocuments({ categoryId: id, isActive: true });
  if (productCount > 0) {
    throw createError(409, 'CATEGORY_IN_USE', 'Cannot delete category referenced by active products');
  }

  await Category.findByIdAndDelete(id);

  return { success: true };
}

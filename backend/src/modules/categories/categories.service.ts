import Category, { ICategory } from '../../models/Category';
import Product from '../../models/Product';
import { createError } from '../../middleware/errorHandler';
import { escapeRegex } from '../../lib/escapeRegex';
import type {
  CreateCategoryDto,
  UpdateCategoryDto,
  ListCategoriesDto,
} from './categories.validation';

interface CategoryResponse {
  id: string;
  name: string;
  taxRate: number;
  isActive: boolean;
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
}

async function categoryResponse(cat: ICategory): Promise<CategoryResponse> {
  const productCount = await Product.countDocuments({ categoryId: cat._id });
  return {
    id: cat._id.toString(),
    name: cat.name,
    taxRate: cat.taxRate,
    isActive: cat.isActive,
    productCount,
    createdAt: cat.createdAt,
    updatedAt: cat.updatedAt,
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
    filter.name = { $regex: escapeRegex(query.search), $options: 'i' };
  }

  if (query.createdAtFrom || query.createdAtTo) {
    const dateFilter: Record<string, Date> = {};
    if (query.createdAtFrom) {
      dateFilter.$gte = query.createdAtFrom;
    }
    if (query.createdAtTo) {
      dateFilter.$lte = query.createdAtTo;
    }
    filter.createdAt = dateFilter;
  }

  const skip = (query.page - 1) * query.limit;

  const [categories, total, counts] = await Promise.all([
    Category.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    Category.countDocuments(filter),
    Product.aggregate([
      { $group: { _id: '$categoryId', count: { $sum: 1 } } },
    ]),
  ]);

  const countMap = new Map(
    counts.map((c: { _id: string; count: number }) => [c._id.toString(), c.count])
  );

  const data: CategoryResponse[] = categories.map((cat) => ({
    id: cat._id.toString(),
    name: cat.name,
    taxRate: cat.taxRate,
    isActive: cat.isActive,
    productCount: countMap.get(cat._id.toString()) ?? 0,
    createdAt: cat.createdAt,
    updatedAt: cat.updatedAt,
  }));

  return {
    data,
    meta: { total, page: query.page, limit: query.limit },
  };
}

export async function getCategoryById(id: string) {
  const category = await Category.findById(id);

  if (!category) {
    throw createError(404, 'NOT_FOUND', 'Category not found');
  }

  return await categoryResponse(category);
}

export async function createCategory(dto: CreateCategoryDto) {
  const existing = await Category.findOne({ name: dto.name });
  if (existing) {
    throw createError(400, 'VALIDATION_ERROR', 'A category with this name already exists');
  }

  const category = await Category.create({
    name: dto.name,
    taxRate: dto.taxRate ?? 5,
    isActive: true,
  });

  return await categoryResponse(category);
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
  if (dto.taxRate !== undefined) updates.taxRate = dto.taxRate;

  const updated = await Category.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!updated) {
    throw createError(404, 'NOT_FOUND', 'Category not found');
  }

  return await categoryResponse(updated);
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

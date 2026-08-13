import Category, { ICategory } from '../../models/Category';
import Product from '../../models/Product';
import { createError } from '../../middleware/errorHandler';
import { escapeRegex } from '../../lib/escapeRegex';
import { paginate } from '../../lib/pagination';
import type {
  CreateCategoryDto,
  UpdateCategoryDto,
  ListCategoriesDto,
} from './categories.validation';

interface CategoryResponse {
  id: string;
  name: string;
  vatRate: number;
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
}

async function categoryResponse(cat: ICategory): Promise<CategoryResponse> {
  const productCount = await Product.countDocuments({ categoryId: cat._id });
  return {
    id: cat._id.toString(),
    name: cat.name,
    vatRate: cat.vatRate,
    productCount,
    createdAt: cat.createdAt,
    updatedAt: cat.updatedAt,
  };
}

export async function listCategories(query: ListCategoriesDto) {
  const filter: Record<string, unknown> = {};

  if (query.search) {
    filter.name = { $regex: escapeRegex(query.search), $options: 'i' };
  }

  const { skip, limit } = paginate(query.page, query.limit);

  const [categories, total, counts] = await Promise.all([
    Category.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Category.countDocuments(filter),
    Product.aggregate([
      { $group: { _id: '$categoryId', count: { $sum: 1 } } },
    ]),
  ]);

  const countMap = new Map(
    counts.map((c: { _id: string; count: number }) => [c._id.toString(), c.count])
  );

  const data: CategoryResponse[] = (categories as unknown as ICategory[]).map((cat) => ({
    id: cat._id.toString(),
    name: cat.name,
    vatRate: cat.vatRate,
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
  const category = await Category.findById(id).lean();

  if (!category) {
    throw createError(404, 'NOT_FOUND', 'Category not found');
  }

  return await categoryResponse(category as unknown as ICategory);
}

export async function createCategory(dto: CreateCategoryDto) {
  const existing = await Category.findOne({ name: dto.name });
  if (existing) {
    throw createError(400, 'VALIDATION_ERROR', 'A category with this name already exists');
  }

  const category = await Category.create({
    name: dto.name,
    vatRate: dto.vatRate,
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
  if (dto.vatRate !== undefined) updates.vatRate = dto.vatRate;

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
  const category = await Category.findByIdAndDelete(id);

  if (!category) {
    throw createError(404, 'NOT_FOUND', 'Category not found');
  }

  return { success: true };
}

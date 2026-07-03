import { PipelineStage, Types } from 'mongoose';
import { buildCancelledExcludedMatch } from '../../lib/aggregation';

export type ReportType = 'sales' | 'profit';

export const REPORT_TYPES: ReportType[] = ['sales', 'profit'];

export function salesAggregation(from: Date, to: Date): PipelineStage[] {
  return [
    { $match: { ...buildCancelledExcludedMatch(), createdAt: { $gte: from, $lte: to } } },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$grandTotal' },
              totalOrders: { $sum: 1 },
              totalProductsSold: { $sum: { $sum: '$items.quantity' } },
              totalDiscountAmount: { $sum: '$discountAmount' },
              totalTaxAmount: { $sum: '$taxAmount' },
            },
          },
        ],
        byPaymentMethod: [
          {
            $group: {
              _id: '$payment.method',
              count: { $sum: 1 },
              revenue: { $sum: '$grandTotal' },
            },
          },
          { $project: { _id: 0, method: '$_id', count: 1, revenue: 1 } },
        ],
        dailyBreakdown: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              orders: { $sum: 1 },
              revenue: { $sum: '$grandTotal' },
            },
          },
          { $project: { _id: 0, date: '$_id', orders: 1, revenue: 1 } },
          { $sort: { date: 1 } },
        ],
        byProduct: [
          { $unwind: '$items' },
          {
            $group: {
              _id: { productId: '$items.productId', name: '$items.nameSnapshot' },
              unitsSold: { $sum: '$items.quantity' },
              income: { $sum: '$items.lineTotal' },
            },
          },
          {
            $lookup: {
              from: 'products',
              localField: '_id.productId',
              foreignField: '_id',
              as: 'product',
            },
          },
          { $unwind: '$product' },
          {
            $lookup: {
              from: 'categories',
              localField: 'product.categoryId',
              foreignField: '_id',
              as: 'category',
            },
          },
          { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
          {
            $addFields: {
              category: { $ifNull: ['$category.name', 'Uncategorized'] },
            },
          },
          {
            $project: {
              _id: 0,
              productId: '$_id.productId',
              name: '$_id.name',
              category: 1,
              unitsSold: 1,
              income: { $round: ['$income', 2] },
            },
          },
          { $sort: { income: -1 } },
        ],
        byCategory: [
          { $unwind: '$items' },
          {
            $lookup: {
              from: 'products',
              localField: 'items.productId',
              foreignField: '_id',
              as: 'product',
            },
          },
          { $unwind: '$product' },
          {
            $lookup: {
              from: 'categories',
              localField: 'product.categoryId',
              foreignField: '_id',
              as: 'category',
            },
          },
          { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: { $ifNull: ['$category.name', 'Uncategorized'] },
              unitsSold: { $sum: '$items.quantity' },
              income: { $sum: '$items.lineTotal' },
            },
          },
          {
            $project: {
              _id: 0,
              category: '$_id',
              unitsSold: 1,
              income: { $round: ['$income', 2] },
            },
          },
          { $sort: { income: -1 } },
        ],
      },
    },
  ];
}

export function expenseAggregation(from: Date, to: Date): PipelineStage[] {
  return [
    { $match: { date: { $gte: from, $lte: to } } },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              totalExpenses: { $sum: '$amount' },
              totalEntries: { $sum: 1 },
            },
          },
        ],
        byCategory: [
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 },
              total: { $sum: '$amount' },
            },
          },
          { $project: { _id: 0, category: '$_id', count: 1, total: 1 } },
          { $sort: { total: -1 } },
        ],
        byPaymentMethod: [
          {
            $group: {
              _id: '$paymentMethod',
              count: { $sum: 1 },
              total: { $sum: '$amount' },
            },
          },
          { $project: { _id: 0, method: '$_id', count: 1, total: 1 } },
        ],
        dailyBreakdown: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
              count: { $sum: 1 },
              total: { $sum: '$amount' },
            },
          },
          { $project: { _id: 0, date: '$_id', count: 1, total: 1 } },
          { $sort: { date: 1 } },
        ],
        byVendor: [
          {
            $group: {
              _id: { $ifNull: ['$vendorId', null] },
              count: { $sum: 1 },
              total: { $sum: '$amount' },
            },
          },
          {
            $lookup: {
              from: 'vendors',
              localField: '_id',
              foreignField: '_id',
              as: 'vendor',
            },
          },
          { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
          {
            $addFields: {
              vendorName: {
                $cond: {
                  if: { $and: [{ $ne: ['$_id', null] }, '$vendor.name'] },
                  then: '$vendor.name',
                  else: 'Unnamed',
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              vendorId: '$_id',
              vendorName: 1,
              count: 1,
              total: 1,
            },
          },
          { $sort: { total: -1 } },
        ],
      },
    },
  ];
}



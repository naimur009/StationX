import { PipelineStage } from 'mongoose';
import Order from '../../models/Order';
import { normalizeDateRange } from '../../lib/date-range';
import { buildRevenueMatch } from '../../lib/aggregation';
import type { DashboardMetricsQueryDto, DashboardTopItemsQueryDto } from './dashboard.validation';

export async function getMetrics(query: DashboardMetricsQueryDto) {
  const { range, from, to } = query;
  const dateRange = normalizeDateRange(range, from, to);

  const pipeline: PipelineStage[] = [
    {
      $match: {
        ...buildRevenueMatch(),
        createdAt: { $gte: dateRange.from, $lte: dateRange.to },
      },
    },
    {
      $group: {
        _id: null,
        totalEarned: { $sum: '$grandTotal' },
        totalProductsSold: { $sum: { $sum: '$items.quantity' } },
        totalOrdersCompleted: { $sum: 1 },
      },
    },
  ];

  const results = await Order.aggregate(pipeline);
  const row = results[0];

  return {
    range: {
      from: dateRange.from.toISOString().split('T')[0],
      to: new Date(dateRange.to.getTime() - 86400000).toISOString().split('T')[0],
    },
    metrics: {
      totalEarned: row?.totalEarned ?? 0,
      totalProductsSold: row?.totalProductsSold ?? 0,
      totalOrdersCompleted: row?.totalOrdersCompleted ?? 0,
    },
  };
}

export async function getTopItems(query: DashboardTopItemsQueryDto) {
  const { range, from, to, limit } = query;
  const dateRange = normalizeDateRange(range, from, to);

  const sortStage: PipelineStage = { $sort: { revenue: -1, '_id.name': 1 } as Record<string, 1 | -1> };

  const pipeline: PipelineStage[] = [
    {
      $match: {
        ...buildRevenueMatch(),
        createdAt: { $gte: dateRange.from, $lte: dateRange.to },
      },
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: { productId: '$items.productId', name: '$items.nameSnapshot' },
        unitsSold: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.lineTotal' },
      },
    },
    sortStage,
    { $limit: limit },
    {
      $project: {
        _id: 0,
        productId: '$_id.productId',
        name: '$_id.name',
        unitsSold: 1,
        revenue: { $round: ['$revenue', 2] },
      },
    },
  ];

  const topItems = await Order.aggregate(pipeline);

  return {
    range: {
      from: dateRange.from.toISOString().split('T')[0],
      to: new Date(dateRange.to.getTime() - 86400000).toISOString().split('T')[0],
    },
    topItems,
  };
}

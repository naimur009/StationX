import { Types } from 'mongoose';
import Order from '../../models/Order';
import Expense from '../../models/Expense';
import Salary from '../../models/Salary';

import Settings from '../../models/Settings';
import { createError } from '../../middleware/errorHandler';
import { renderPdf } from '../../lib/pdf';
import { renderReportToHtml } from './report-template';
import {
  salesAggregation,
  expenseAggregation,
  REPORT_TYPES,
  type ReportType,
} from './reports.helper';
import type { ReportQueryDto, ExportQueryDto } from './reports.validation';
import { normalizeDateRange } from '../../lib/date-range';

function arrayToObject(
  arr: Array<{ method: string; count: number; revenue?: number; total?: number }>,
  valueKeys: string[]
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};
  for (const item of arr) {
    const obj: Record<string, number> = {};
    for (const key of valueKeys) {
      if (item[key as keyof typeof item] !== undefined) {
        obj[key] = item[key as keyof typeof item] as number;
      }
    }
    result[item.method] = obj;
  }
  return result;
}

export async function getReport(type: string, query: ReportQueryDto) {
  if (!REPORT_TYPES.includes(type as ReportType)) {
    throw createError(400, 'INVALID_REPORT_TYPE', `Unknown report type: ${type}. Valid types: ${REPORT_TYPES.join(', ')}`);
  }

  const { range, from, to } = query;
  const dateRange = normalizeDateRange(range, from, to);

  let result: Record<string, unknown>;

  switch (type as ReportType) {
    case 'sales': {
      const pipeline = salesAggregation(dateRange.from, dateRange.to);
      const aggResult = await Order.aggregate(pipeline);
      const data = aggResult[0] || { summary: [], byPaymentMethod: [], dailyBreakdown: [] };

      const summaryRow = data.summary[0] || {};
      const totalOrders = summaryRow.totalOrders || 0;

      const byProduct = (data.byProduct || []).map(
        (item: { productId: Types.ObjectId; name: string; category: string; unitsSold: number; income: number }) => ({
          ...item,
          productId: item.productId.toString(),
          percentageOfTotal:
            (summaryRow.totalRevenue || 0) > 0
              ? Math.round((item.income / (summaryRow.totalRevenue || 0)) * 1000) / 10
              : 0,
        })
      );

      result = {
        range: {
          from: dateRange.from.toISOString().split('T')[0],
          to: new Date(dateRange.to.getTime() - 86400000).toISOString().split('T')[0],
        },
        summary: {
          totalRevenue: summaryRow.totalRevenue || 0,
          totalOrders,
          totalProductsSold: summaryRow.totalProductsSold || 0,
          totalDiscountAmount: summaryRow.totalDiscountAmount || 0,
          totalTaxAmount: summaryRow.totalTaxAmount || 0,
        },
        byPaymentMethod: arrayToObject(data.byPaymentMethod || [], ['count', 'revenue']),
        dailyBreakdown: data.dailyBreakdown || [],
        byProduct,
        byCategory: data.byCategory || [],
      };
      break;
    }

    case 'profit': {
      const salesPipeline = salesAggregation(dateRange.from, dateRange.to);
      const salesAggResult = await Order.aggregate(salesPipeline);
      const salesData = salesAggResult[0] || { summary: [] };
      const salesSummaryRow = salesData.summary[0] || {};
      const totalRevenue = salesSummaryRow.totalRevenue || 0;

      const expensePipeline = expenseAggregation(dateRange.from, dateRange.to);
      const expenseAggResult = await Expense.aggregate(expensePipeline);
      const expenseData = expenseAggResult[0] || { summary: [] };
      const expenseSummaryRow = expenseData.summary[0] || {};
      const totalExpenses = expenseSummaryRow.totalExpenses || 0;

      const salaryRecords = await Salary.find({
        createdAt: { $gte: dateRange.from, $lte: dateRange.to },
        status: { $ne: 'cancelled' },
      }).populate('employeeId', 'name');

      const totalSalary = salaryRecords.reduce((sum, r) => sum + (r.baseSalary || 0), 0);
      const byEmployee = salaryRecords
        .map((r) => ({
          employeeName: (r.employeeId as { name?: string })?.name || 'Unknown',
          baseSalary: r.baseSalary || 0,
          status: r.status,
        }))
        .sort((a, b) => a.employeeName.localeCompare(b.employeeName));

      const profit = totalRevenue - totalExpenses - totalSalary;

      result = {
        range: {
          from: dateRange.from.toISOString().split('T')[0],
          to: new Date(dateRange.to.getTime() - 86400000).toISOString().split('T')[0],
        },
        income: {
          totalRevenue,
          totalOrders: salesSummaryRow.totalOrders || 0,
          totalProductsSold: salesSummaryRow.totalProductsSold || 0,
        },
        expenses: {
          totalExpenses,
          totalEntries: expenseSummaryRow.totalEntries || 0,
          byCategory: expenseData.byCategory || [],
        },
        salaries: {
          totalSalary,
          totalRecords: salaryRecords.length,
          byEmployee,
        },
        profit,
      };
      break;
    }

    default:
      throw createError(400, 'INVALID_REPORT_TYPE', `Unknown report type: ${type}`);
  }

  return { data: result };
}

export async function exportReport(type: string, query: ExportQueryDto): Promise<Buffer> {
  const { data } = await getReport(type, query);

  const settings = await Settings.findById('restaurant-settings').lean();

  const html = renderReportToHtml(type as ReportType, data, {
    restaurantName: settings?.restaurantName || '',
    logo: settings?.logo || undefined,
  });

  const pdfBuffer = await renderPdf(html);
  return pdfBuffer;
}

import { Types } from 'mongoose';
import Order from '../../models/Order';
import Expense from '../../models/Expense';
import Attendance from '../../models/Attendance';
import Settings from '../../models/Settings';
import { createError } from '../../middleware/errorHandler';
import { renderPdf } from '../../lib/pdf';
import { renderReportToHtml } from './report-template';
import {
  salesAggregation,
  incomeAggregation,
  expenseAggregation,
  attendanceAggregation,
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

      result = {
        range: {
          from: dateRange.from.toISOString().split('T')[0],
          to: new Date(dateRange.to.getTime() - 86400000).toISOString().split('T')[0],
        },
        summary: {
          totalRevenue: summaryRow.totalRevenue || 0,
          totalOrders,
          averageOrderValue: totalOrders > 0
            ? Math.round(((summaryRow.totalRevenue || 0) / totalOrders) * 100) / 100
            : 0,
          totalProductsSold: summaryRow.totalProductsSold || 0,
          totalDiscountAmount: summaryRow.totalDiscountAmount || 0,
          totalTaxAmount: summaryRow.totalTaxAmount || 0,
        },
        byPaymentMethod: arrayToObject(data.byPaymentMethod || [], ['count', 'revenue']),
        dailyBreakdown: data.dailyBreakdown || [],
      };
      break;
    }

    case 'income': {
      const pipeline = incomeAggregation(dateRange.from, dateRange.to);
      const aggResult = await Order.aggregate(pipeline);
      const data = aggResult[0] || { summary: [], byProduct: [], byCategory: [] };

      const summaryRow = data.summary[0] || {};
      const byProduct = (data.byProduct || []).map(
        (item: { productId: Types.ObjectId; name: string; category: string; unitsSold: number; income: number }, _index: number, arr: Array<{ income: number }>) => ({
          ...item,
          productId: item.productId.toString(),
          percentageOfTotal:
            (summaryRow.totalIncome || 0) > 0
              ? Math.round((item.income / (summaryRow.totalIncome || 0)) * 1000) / 10
              : 0,
        })
      );
      const byCategory = data.byCategory || [];
      const topCategory = byCategory.length > 0 ? byCategory[0].category : null;

      result = {
        range: {
          from: dateRange.from.toISOString().split('T')[0],
          to: new Date(dateRange.to.getTime() - 86400000).toISOString().split('T')[0],
        },
        summary: {
          totalIncome: summaryRow.totalIncome || 0,
          totalProductsSold: summaryRow.totalProductsSold || 0,
          uniqueProductsSold: byProduct.length,
          topCategory,
        },
        byProduct,
        byCategory,
      };
      break;
    }

    case 'expense': {
      const pipeline = expenseAggregation(dateRange.from, dateRange.to);
      const aggResult = await Expense.aggregate(pipeline);
      const data = aggResult[0] || { summary: [], byCategory: [], byPaymentMethod: [], dailyBreakdown: [], byVendor: [] };

      const summaryRow = data.summary[0] || {};
      const totalEntries = summaryRow.totalEntries || 0;

      result = {
        range: {
          from: dateRange.from.toISOString().split('T')[0],
          to: new Date(dateRange.to.getTime() - 86400000).toISOString().split('T')[0],
        },
        summary: {
          totalExpenses: summaryRow.totalExpenses || 0,
          totalEntries,
          averageExpense: totalEntries > 0
            ? Math.round(((summaryRow.totalExpenses || 0) / totalEntries) * 100) / 100
            : 0,
        },
        byCategory: data.byCategory || [],
        byVendor: data.byVendor || [],
        byPaymentMethod: arrayToObject(data.byPaymentMethod || [], ['count', 'total']),
        dailyBreakdown: data.dailyBreakdown || [],
      };
      break;
    }

    case 'attendance': {
      const pipeline = attendanceAggregation(dateRange.from, dateRange.to);
      const aggResult = await Attendance.aggregate(pipeline);
      const data = aggResult[0] || { summary: [], byStaff: [], dailyTrend: [] };

      const summaryRow = data.summary[0] || {};
      const totalStaff = data.byStaff.length;
      const totalWorkingDays = data.dailyTrend.length;
      const totalPossible = totalStaff * totalWorkingDays;

      result = {
        range: {
          from: dateRange.from.toISOString().split('T')[0],
          to: new Date(dateRange.to.getTime() - 86400000).toISOString().split('T')[0],
        },
        summary: {
          totalRecords: summaryRow.totalRecords || 0,
          totalStaff,
          workingDays: totalWorkingDays,
          present: summaryRow.present || 0,
          absent: summaryRow.absent || 0,
          late: summaryRow.late || 0,
          halfDay: summaryRow.halfDay || 0,
          overallAttendanceRate:
            totalPossible > 0
              ? Math.round((((summaryRow.present || 0) + (summaryRow.late || 0) + (summaryRow.halfDay || 0)) / totalPossible) * 1000) / 10
              : 0,
        },
        byStaff: (data.byStaff || []).map(
          (item: { userId: Types.ObjectId; name: string; role: string; present: number; absent: number; late: number; halfDay: number; totalHours: number }) => ({
            ...item,
            userId: item.userId.toString(),
            attendanceRate:
              totalWorkingDays > 0
                ? Math.round(((item.present || 0) / totalWorkingDays) * 1000) / 10
                : 0,
          })
        ),
        dailyTrend: data.dailyTrend || [],
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

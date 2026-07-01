import { z } from 'zod';

export type ReportType = 'sales' | 'income' | 'expense';

export const REPORT_TYPES: ReportType[] = ['sales', 'income', 'expense'];

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  sales: 'Sales',
  income: 'Income',
  expense: 'Expense',
};

export const reportQuerySchema = z.object({
  range: z.enum(['today', 'week', 'month', 'custom']).default('month'),
  from: z.string().optional(),
  to: z.string().optional(),
});

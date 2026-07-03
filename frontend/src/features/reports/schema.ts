import { z } from 'zod';

export type ReportType = 'sales' | 'profit';

export const REPORT_TYPES: ReportType[] = ['sales', 'profit'];

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  sales: 'Sales',
  profit: 'Profit',
};

export const reportQuerySchema = z.object({
  range: z.enum(['today', 'week', 'month', 'custom']).default('month'),
  from: z.string().optional(),
  to: z.string().optional(),
});

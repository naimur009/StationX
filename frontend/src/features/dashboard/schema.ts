import { z } from 'zod';

export const dashboardRangeEnum = z.enum(['today', 'week', 'month', 'year', 'custom']);

export const dashboardFilterSchema = z.object({
  range: dashboardRangeEnum.default('today'),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type DashboardFilterFormData = z.infer<typeof dashboardFilterSchema>;

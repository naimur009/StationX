import { z } from 'zod';
import { DATE_RANGES } from '../../lib/date-range';

const rangeEnum = z.enum(DATE_RANGES);

export const dashboardMetricsQuerySchema = z.object({
  range: rangeEnum.default('today'),
  from: z.string().optional(),
  to: z.string().optional(),
}).strict().refine(
  (data) => {
    if (data.range === 'custom') return !!data.from && !!data.to;
    return true;
  },
  { message: 'range=custom requires both from and to parameters' }
);

export const dashboardTopItemsQuerySchema = z.object({
  range: rangeEnum.default('today'),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().positive().max(50).default(10),
}).strict().refine(
  (data) => {
    if (data.range === 'custom') return !!data.from && !!data.to;
    return true;
  },
  { message: 'range=custom requires both from and to parameters' }
);

export type DashboardMetricsQueryDto = z.infer<typeof dashboardMetricsQuerySchema>;
export type DashboardTopItemsQueryDto = z.infer<typeof dashboardTopItemsQuerySchema>;

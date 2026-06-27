import { z } from 'zod';

const rangeEnum = z.enum(['today', 'week', 'month', 'custom']);

export const reportQuerySchema = z.object({
  range: rangeEnum.default('month'),
  from: z.string().optional(),
  to: z.string().optional(),
}).strict().refine(
  (data) => {
    if (data.range === 'custom') {
      return !!data.from && !!data.to;
    }
    return true;
  },
  {
    message: 'range=custom requires both from and to parameters',
  }
);

export const exportQuerySchema = z.object({
  range: rangeEnum.default('month'),
  from: z.string().optional(),
  to: z.string().optional(),
  format: z.enum(['pdf']),
}).strict().refine(
  (data) => {
    if (data.range === 'custom') {
      return !!data.from && !!data.to;
    }
    return true;
  },
  {
    message: 'range=custom requires both from and to parameters',
  }
);

export type ReportQueryDto = z.infer<typeof reportQuerySchema>;
export type ExportQueryDto = z.infer<typeof exportQuerySchema>;

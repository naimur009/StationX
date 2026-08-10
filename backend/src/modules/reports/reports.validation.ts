import { z } from 'zod';
import { DATE_RANGES } from '../../lib/date-range';
import { REPORT_TYPES } from './reports.helper';

const rangeEnum = z.enum(DATE_RANGES);

export const reportTypeParamSchema = z.object({
  type: z.enum(REPORT_TYPES as [string, ...string[]], { message: `Invalid report type. Valid types: ${REPORT_TYPES.join(', ')}` }),
});

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

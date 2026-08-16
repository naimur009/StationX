import { createError } from '../middleware/errorHandler';

export const DATE_RANGES = ['today', 'week', 'month', 'custom'] as const;
export type DateRangeValue = (typeof DATE_RANGES)[number];

export interface DateRange {
  from: Date;
  to: Date;
}

export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function normalizeDateRange(range: string, from?: string, to?: string): DateRange {
  const now = new Date();

  switch (range) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return { from: start, to: end };
    }
    case 'week': {
      const daysSinceMonday = (now.getDay() + 6) % 7;
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return { from: start, to: end };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return { from: start, to: end };
    }
    case 'custom': {
      if (!from || !to) {
        throw createError(400, 'VALIDATION_ERROR', 'from and to are required for custom range');
      }
      const start = new Date(from);
      const end = new Date(to);
      end.setDate(end.getDate() + 1);
      return { from: start, to: end };
    }
    default:
      throw createError(400, 'VALIDATION_ERROR', `Invalid range: ${range}`);
  }
}

'use client';

import { useState, useCallback } from 'react';

export type DateRange = 'today' | 'week' | 'month' | 'custom';

export interface DateRangeFilter {
  range: DateRange;
  from?: string;
  to?: string;
}

export function useDateRangeFilter(initialRange: DateRange = 'today') {
  const [filter, setFilter] = useState<DateRangeFilter>({
    range: initialRange,
  });

  const setRange = useCallback((range: DateRange) => {
    setFilter((prev) => ({ ...prev, range, from: undefined, to: undefined }));
  }, []);

  const setCustomRange = useCallback((from: string, to: string) => {
    setFilter({ range: 'custom', from, to });
  }, []);

  const queryParams = new URLSearchParams();

  if (filter.range !== 'custom') {
    queryParams.set('range', filter.range);
  } else {
    queryParams.set('range', 'custom');
    if (filter.from) queryParams.set('from', filter.from);
    if (filter.to) queryParams.set('to', filter.to);
  }

  return {
    filter,
    setRange,
    setCustomRange,
    queryString: queryParams.toString(),
  };
}

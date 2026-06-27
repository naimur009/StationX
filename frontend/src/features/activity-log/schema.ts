export const activityLogFiltersSchema = {
  page: 1,
  limit: 20,
} as const;

export interface ActivityLogActor {
  id: string;
  name: string;
  role: string;
}

export interface ActivityLogEntry {
  id: string;
  actor: ActivityLogActor | null;
  module: string;
  action: string;
  targetId: string | null;
  targetType: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ActivityLogMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ActivityLogListResponse {
  data: ActivityLogEntry[];
  meta: ActivityLogMeta;
}

export interface ActivityLogFilters {
  page: number;
  limit: number;
  actor?: string;
  module?: string;
  action?: string;
  search?: string;
  from?: string;
  to?: string;
}

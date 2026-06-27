import ActivityLog from '../../models/ActivityLog';
import { escapeRegex } from '../../lib/escapeRegex';
import type { ListActivityLogDto } from './activity-log.validation';

interface ActivityLogMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ActivityLogEntry {
  id: unknown;
  actor: { id: unknown; name: string; role: string } | null;
  module: string;
  action: string;
  targetId: unknown;
  targetType: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

interface ActivityLogListResult {
  data: ActivityLogEntry[];
  meta: ActivityLogMeta;
}

export async function listActivityLogs(query: ListActivityLogDto): Promise<ActivityLogListResult> {
  const filter: Record<string, unknown> = {};

  if (query.actor) {
    filter.actor = query.actor;
  }

  if (query.module) {
    filter.module = query.module;
  }

  if (query.action) {
    filter.action = { $regex: `^${escapeRegex(query.action)}` };
  }

  if (query.search) {
    filter.description = { $regex: escapeRegex(query.search), $options: 'i' };
  }

  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) {
      (filter.createdAt as Record<string, unknown>).$gte = new Date(query.from);
    }
    if (query.to) {
      (filter.createdAt as Record<string, unknown>).$lte = new Date(query.to + 'T23:59:59.999Z');
    }
  }

  const skip = (query.page - 1) * query.limit;

  const [logs, total] = await Promise.all([
    ActivityLog.find(filter)
      .populate('actor', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .lean(),
    ActivityLog.countDocuments(filter),
  ]);

  const data = logs.map((log) => {
    const populatedActor = log.actor && typeof log.actor === 'object' && '_id' in log.actor
      ? (log.actor as unknown as { _id: unknown; name: string; role: string })
      : null;

    return {
      id: log._id,
      actor: populatedActor
        ? {
            id: populatedActor._id,
            name: populatedActor.name,
            role: populatedActor.role,
          }
        : null,
    module: log.module,
    action: log.action,
    targetId: log.targetId ?? null,
    targetType: log.targetType ?? null,
    description: log.description,
    metadata: log.metadata ?? null,
    createdAt: log.createdAt,
    };
  });

  return {
    data,
    meta: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

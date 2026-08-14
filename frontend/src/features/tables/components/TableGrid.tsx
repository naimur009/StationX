'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTableList, type TableResponse } from '../api';
import { useTableStatusSync } from '@/hooks/useTableStatusSync';
import { cn } from '@/lib/utils';
import { Pencil, Hand, Loader2 } from 'lucide-react';
import PermissionGate from '@/components/shared/PermissionGate';

interface TableGridProps {
  onEdit?: (table: TableResponse) => void;
  onOverride?: (table: TableResponse) => void;
  onSelect?: (table: TableResponse) => void;
  selectable?: boolean;
  selectedId?: string | null;
}

const STATUS_TILE: Record<TableResponse['status'], string> = {
  available: 'bg-green-500',
  booked: 'bg-red-500',
  maintenance: 'bg-yellow-500',
};

const STATUS_LABEL: Record<TableResponse['status'], { label: string; className: string } | null> = {
  available: null,
  booked: { label: 'In Use', className: 'bg-white/90 text-slate-700' },
  maintenance: { label: 'Out of Service', className: 'bg-white/90 text-slate-700' },
};

export default function TableGrid({
  onEdit,
  onOverride,
  onSelect,
  selectable,
  selectedId,
}: TableGridProps) {
  const router = useRouter();
  useTableStatusSync();
  const { data, isLoading } = useTableList();

  const tables = useMemo(() => data?.data ?? [], [data]);

  const sorted = useMemo(
    () => [...tables].sort((a, b) => a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true })),
    [tables]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <p className="text-sm text-slate-400">No tables configured yet — set the table count in Settings to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
          <span className="text-slate-500">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
          <span className="text-slate-500">Occupied</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-yellow-500" />
          <span className="text-slate-500">Out of Service</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {sorted.map((table) => {
          const clickable = table.status === 'available';
          const statusLabel = STATUS_LABEL[table.status];

          return (
            <div
              key={table.id}
              className={cn(
                'relative flex min-h-[88px] cursor-default flex-col items-center justify-center rounded-xl p-3 text-white shadow-sm transition-all duration-200',
                STATUS_TILE[table.status],
                clickable && !selectable && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md',
                clickable && selectable && onSelect && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md',
                selectable && table.id === selectedId && 'ring-2 ring-primary ring-offset-2'
              )}
              onClick={() => {
                if (!clickable) return;
                if (selectable) {
                  onSelect?.(table);
                } else {
                  router.push(`/pos?table=${table.id}`);
                }
              }}
            >
              <span className="text-lg font-bold">{table.tableNumber}</span>
              {table.capacity != null && (
                <span className="text-xs text-white/80">Seats {table.capacity}</span>
              )}

              {statusLabel && (
                <div className={cn('mt-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold', statusLabel.className)}>
                  {statusLabel.label}
                </div>
              )}

              {!selectable && (
                <div className="absolute right-1.5 top-1.5 flex gap-0.5">
                  <PermissionGate module="tables" action="edit">
                    <button
                      onClick={(e) => { e.stopPropagation(); onOverride?.(table); }}
                      className="rounded-md p-1 text-white/80 transition-colors hover:bg-white/25 hover:text-white"
                      title="Manual override"
                    >
                      <Hand className="h-3.5 w-3.5" />
                    </button>
                  </PermissionGate>
                  <PermissionGate module="tables" action="edit">
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit?.(table); }}
                      className="rounded-md p-1 text-white/80 transition-colors hover:bg-white/25 hover:text-white"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </PermissionGate>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
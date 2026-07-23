'use client';

import { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTableList, type TableResponse } from '../api';
import { getSocket } from '@/lib/socket';
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

export default function TableGrid({
  onEdit,
  onOverride,
  onSelect,
  selectable,
  selectedId,
}: TableGridProps) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useTableList();

  useEffect(() => {
    const socket = getSocket();
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    };
    socket.on('table:statusChanged', handler);
    return () => {
      socket.off('table:statusChanged', handler);
    };
  }, [queryClient]);

  const tables = data?.data ?? [];

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
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
          <span className="text-slate-500">Available</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
          <span className="text-slate-500">Booked</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {sorted.map((table) => (
          <div
            key={table.id}
            className={cn(
              'relative flex min-h-[72px] flex-col items-center justify-center rounded-xl p-4 shadow-sm transition-all duration-200',
              table.status === 'available'
                ? 'border-2 border-green-200 bg-green-50'
                : 'border-2 border-red-200 bg-red-50',
              selectable && table.status === 'available' && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md',
              selectable && table.id === selectedId && 'ring-2 ring-primary ring-offset-2',
              !selectable && 'hover:-translate-y-0.5 hover:shadow-md'
            )}
            onClick={() => {
              if (selectable && table.status === 'available' && onSelect) onSelect(table);
            }}
          >
            <span className="text-lg font-bold text-slate-800">{table.tableNumber}</span>
            {table.capacity != null && (
              <span className="text-xs text-slate-400">Seats {table.capacity}</span>
            )}

            {table.status === 'booked' && table.bookedBy === 'order' && (
              <div className="mt-1.5 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                In Use
              </div>
            )}

            {table.status === 'booked' && table.bookedBy === 'manual' && (
              <div className="mt-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                Blocked
              </div>
            )}

            {!selectable && (
              <div className="absolute right-1.5 top-1.5 flex gap-0.5">
                <PermissionGate module="tables" action="edit">
                  <button
                    onClick={(e) => { e.stopPropagation(); onOverride?.(table); }}
                    className="rounded-md p-1 text-slate-400 transition-colors hover:bg-white/60 hover:text-amber-600"
                    title="Manual override"
                  >
                    <Hand className="h-3.5 w-3.5" />
                  </button>
                </PermissionGate>
                <PermissionGate module="tables" action="edit">
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit?.(table); }}
                    className="rounded-md p-1 text-slate-400 transition-colors hover:bg-white/60 hover:text-blue-600"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </PermissionGate>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

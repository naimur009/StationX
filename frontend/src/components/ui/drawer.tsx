'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: DrawerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-border bg-white shadow-2xl',
          'animate-[drawer-bottom_250ms_ease-out]',
          'md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:h-full md:max-w-md md:rounded-none md:rounded-l-2xl md:animate-[drawer-right_250ms_ease-out]',
          className
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
          <h2 className="text-base font-bold text-slate-800 sm:text-lg">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-border px-4 py-4 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

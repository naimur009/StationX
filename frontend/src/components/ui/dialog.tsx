'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  size?: DialogSize;
}

const sizeClasses: Record<DialogSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'mx-4 w-[calc(100%-2rem)]',
};

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  className,
  size = 'md',
}: DialogProps) {
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={cn(
          'flex max-h-[90vh] w-full flex-col rounded-2xl border border-border bg-white shadow-2xl',
          'animate-[modal-enter_200ms_ease-out]',
          sizeClasses[size],
          className
        )}
      >
          <div className="flex items-center justify-between border-b border-border px-4 sm:px-6 py-4">
            <h2 className="text-base font-bold text-slate-800 sm:text-lg">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 sm:p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">{children}</div>

          {footer && (
            <div className="flex items-center justify-end gap-3 border-t border-border px-4 sm:px-6 py-4">
              {footer}
            </div>
          )}
        </div>
      </div>
  );
}

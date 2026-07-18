'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className, error, placeholder, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring',
          error
            ? 'border-red-400 focus:ring-red-400'
            : 'border-slate-300',
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {children}
      </select>
    );
  }
);

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, error, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring',
          error
            ? 'border-red-400 focus:ring-red-400'
            : 'border-slate-300',
          className
        )}
        {...props}
      />
    );
  }
);

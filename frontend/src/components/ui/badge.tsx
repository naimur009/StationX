import { cn } from '@/lib/utils';

type BadgeVariant = 'green' | 'red' | 'yellow' | 'blue' | 'slate';

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
  green: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  red: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
};

export function Badge({ variant, children, className }: BadgeProps) {
  const styles = variantStyles[variant];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        styles.bg,
        styles.text,
        className
      )}
    >
      <span className={cn('inline-block h-1.5 w-1.5 rounded-full', styles.dot)} />
      {children}
    </span>
  );
}

'use client';

function ActivityLogAvatar({ name }: { name: string | null }) {
  if (!name) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-400">
        ?
      </div>
    );
  }

  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-xs font-semibold text-[hsl(var(--primary-foreground))]">
      {initial}
    </div>
  );
}

export default ActivityLogAvatar;

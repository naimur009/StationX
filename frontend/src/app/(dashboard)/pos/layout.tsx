'use client';

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg:h-[calc(100dvh-8rem)] lg:overflow-hidden">
      {children}
    </div>
  );
}
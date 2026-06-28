'use client';

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {children}
    </div>
  );
}

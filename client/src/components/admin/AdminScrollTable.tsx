import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AdminScrollTableProps {
  columns: string[];
  gridClassName: string;
  minWidthClassName?: string;
  children: ReactNode;
  emptyState?: ReactNode;
}

export function AdminScrollTable({
  columns,
  gridClassName,
  minWidthClassName = 'min-w-[52rem]',
  children,
  emptyState,
}: AdminScrollTableProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 lg:hidden">Swipe sideways to view all columns.</p>
      <div className="overflow-x-auto rounded-2xl border border-[#18263b] [-webkit-overflow-scrolling:touch]">
        <div className={minWidthClassName}>
          <div
            className={cn(
              'grid gap-4 border-b border-[#18263b] bg-[#0c1830] px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500',
              gridClassName,
            )}
          >
            {columns.map((column) => (
              <span key={column} className="whitespace-nowrap">
                {column}
              </span>
            ))}
          </div>

          <div className="divide-y divide-[#18263b] bg-[#07111f]">
            {children}
            {emptyState}
          </div>
        </div>
      </div>
    </div>
  );
}

interface AdminScrollTableRowProps {
  gridClassName: string;
  children: ReactNode;
}

export function AdminScrollTableRow({ gridClassName, children }: AdminScrollTableRowProps) {
  return (
    <div
      className={cn(
        'grid items-center gap-4 px-5 py-4 transition-colors hover:bg-[#0b1a30]',
        gridClassName,
      )}
    >
      {children}
    </div>
  );
}

import type { ReactNode } from 'react';
import { useTheme } from '@/hooks/useTheme';
import {
  adminSubtleTextClass,
  adminTableBodyClass,
  adminTableHeaderClass,
  adminTableRowHoverClass,
  adminTableShellClass,
} from '@/lib/admin-theme';
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
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="space-y-2">
      <p className={cn('text-xs lg:hidden', adminSubtleTextClass(isDark))}>
        Swipe sideways to view all columns.
      </p>
      <div className={adminTableShellClass(isDark)}>
        <div className={minWidthClassName}>
          <div className={cn('grid gap-4', adminTableHeaderClass(isDark), gridClassName)}>
            {columns.map((column) => (
              <span key={column} className="whitespace-nowrap">
                {column}
              </span>
            ))}
          </div>

          <div className={adminTableBodyClass(isDark)}>
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
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      className={cn(
        'grid items-center gap-4 px-5 py-4 transition-colors',
        adminTableRowHoverClass(isDark),
        gridClassName,
      )}
    >
      {children}
    </div>
  );
}

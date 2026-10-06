import { ChevronLeft, ChevronRight } from 'lucide-react';
import { adminMutedTextClass, adminSubtleTextClass } from '@/lib/admin-theme';
import { cn } from '@/lib/utils';

interface AdminListPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageStart: number;
  pageEnd: number;
  onPageChange: (page: number) => void;
  isDark?: boolean;
  className?: string;
}

export function AdminListPagination({
  page,
  totalPages,
  totalItems,
  pageStart,
  pageEnd,
  onPageChange,
  isDark = false,
  className,
}: AdminListPaginationProps) {
  if (totalItems === 0) return null;

  const pageButtonClass = (active: boolean) =>
    cn(
      'inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2.5 text-sm font-medium transition-colors',
      active
        ? 'border-[#f26522] bg-[#f26522] text-white'
        : isDark
          ? 'border-[#243247] bg-[#0a1628] text-slate-200 hover:border-[#f26522]/60'
          : 'border-slate-200 bg-white text-slate-700 hover:border-[#f26522]/50',
    );

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between',
        isDark ? 'border-[#18263b]' : 'border-slate-200',
        className,
      )}
    >
      <p className={cn('text-sm', adminMutedTextClass(isDark))}>
        Showing {pageStart} to {pageEnd} of {totalItems} results
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={cn(pageButtonClass(false), 'disabled:cursor-not-allowed disabled:opacity-40')}
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: totalPages }, (_, index) => index + 1)
          .filter((pageNumber) => {
            if (totalPages <= 7) return true;
            if (pageNumber === 1 || pageNumber === totalPages) return true;
            return Math.abs(pageNumber - page) <= 1;
          })
          .map((pageNumber, index, visiblePages) => {
            const previous = visiblePages[index - 1];
            const showEllipsis = previous != null && pageNumber - previous > 1;
            return (
              <span key={pageNumber} className="contents">
                {showEllipsis ? (
                  <span className={cn('px-1 text-sm', adminSubtleTextClass(isDark))}>…</span>
                ) : null}
                <button
                  type="button"
                  className={pageButtonClass(pageNumber === page)}
                  onClick={() => onPageChange(pageNumber)}
                  aria-label={`Page ${pageNumber}`}
                  aria-current={pageNumber === page ? 'page' : undefined}
                >
                  {pageNumber}
                </button>
              </span>
            );
          })}
        <button
          type="button"
          className={cn(pageButtonClass(false), 'disabled:cursor-not-allowed disabled:opacity-40')}
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

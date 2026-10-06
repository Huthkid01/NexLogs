import { useEffect, useMemo, useState } from 'react';

export const ADMIN_LIST_PAGE_SIZE = 10;

export function useAdminListPagination<T>(
  items: T[],
  options?: { pageSize?: number; resetKey?: string | number },
) {
  const pageSize = options?.pageSize ?? ADMIN_LIST_PAGE_SIZE;
  const resetKey = options?.resetKey;
  const [page, setPage] = useState(1);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    setPage(1);
  }, [resetKey, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  const pageStart = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, totalItems);

  return {
    page: currentPage,
    setPage,
    totalPages,
    totalItems,
    pageStart,
    pageEnd,
    paginatedItems,
    pageSize,
  };
}

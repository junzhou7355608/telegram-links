import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@repo/ui/components/pagination';
import { paginationItems } from '@repo/ui/lib/pagination-items';

interface LinkPaginationProps {
  page: number;
  pageCount: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function LinkPagination({
  page,
  pageCount,
  total,
  onPageChange,
}: LinkPaginationProps) {
  if (pageCount <= 1) {
    return (
      <p className="text-center text-xs text-muted-foreground">
        共 {total} 条结果
      </p>
    );
  }

  function handlePageChange(
    event: React.MouseEvent<HTMLAnchorElement>,
    nextPage: number,
  ) {
    event.preventDefault();
    if (nextPage < 1 || nextPage > pageCount) {
      return;
    }

    onPageChange(nextPage);
    document.getElementById('link-results')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
      block: 'start',
    });
  }

  return (
    <div className="flex flex-col items-center justify-between gap-3 pt-2 sm:flex-row">
      <p className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
        共 {total} 条，第 {page} / {pageCount} 页
      </p>
      <Pagination
        className="mx-0 min-w-0 max-w-full sm:w-auto"
        aria-label="链接分页"
      >
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href={`#page-${Math.max(1, page - 1)}`}
              text="上一页"
              aria-label="上一页"
              aria-disabled={page === 1}
              tabIndex={page === 1 ? -1 : 0}
              className={
                page === 1 ? 'pointer-events-none opacity-50' : undefined
              }
              onClick={(event) => handlePageChange(event, page - 1)}
            />
          </PaginationItem>
          {paginationItems(page, pageCount).map((item) =>
            typeof item === 'number' ? (
              <PaginationItem key={item}>
                <PaginationLink
                  href={`#page-${item}`}
                  isActive={item === page}
                  onClick={(event) => handlePageChange(event, item)}
                >
                  {item}
                </PaginationLink>
              </PaginationItem>
            ) : (
              <PaginationItem key={item}>
                <PaginationEllipsis />
              </PaginationItem>
            ),
          )}
          <PaginationItem>
            <PaginationNext
              href={`#page-${Math.min(pageCount, page + 1)}`}
              text="下一页"
              aria-label="下一页"
              aria-disabled={page === pageCount}
              tabIndex={page === pageCount ? -1 : 0}
              className={
                page === pageCount
                  ? 'pointer-events-none opacity-50'
                  : undefined
              }
              onClick={(event) => handlePageChange(event, page + 1)}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

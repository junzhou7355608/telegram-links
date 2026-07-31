import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@repo/ui/components/pagination';

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
      <p className="text-xs text-muted-foreground">
        共 {total} 条，第 {page} / {pageCount} 页
      </p>
      <Pagination className="mx-0 w-auto" aria-label="链接分页">
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
          {Array.from({ length: pageCount }, (_, index) => index + 1).map(
            (pageNumber) => (
              <PaginationItem key={pageNumber}>
                <PaginationLink
                  href={`#page-${pageNumber}`}
                  isActive={pageNumber === page}
                  onClick={(event) => handlePageChange(event, pageNumber)}
                >
                  {pageNumber}
                </PaginationLink>
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

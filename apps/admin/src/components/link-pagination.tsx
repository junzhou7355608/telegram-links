import { Button } from '@repo/ui/components/button';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from '@repo/ui/components/pagination';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-xs text-muted-foreground">
        共 {total} 条，第 {page} / {pageCount} 页
      </p>
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={page <= 1}
              aria-label="上一页"
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft />
            </Button>
          </PaginationItem>
          {Array.from({ length: pageCount }, (_, index) => index + 1).map(
            (pageNumber) => (
              <PaginationItem key={pageNumber}>
                <Button
                  type="button"
                  variant={page === pageNumber ? 'outline' : 'ghost'}
                  size="icon"
                  aria-label={`第 ${pageNumber} 页`}
                  aria-current={page === pageNumber ? 'page' : undefined}
                  onClick={() => onPageChange(pageNumber)}
                >
                  {pageNumber}
                </Button>
              </PaginationItem>
            ),
          )}
          <PaginationItem>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={page >= pageCount}
              aria-label="下一页"
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight />
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

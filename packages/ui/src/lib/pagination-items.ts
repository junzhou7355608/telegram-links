export type PaginationItemValue = number | 'end-ellipsis' | 'start-ellipsis';

export function paginationItems(
  page: number,
  pageCount: number,
): PaginationItemValue[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  if (page <= 4) {
    return [1, 2, 3, 4, 5, 'end-ellipsis', pageCount];
  }

  if (page >= pageCount - 3) {
    return [
      1,
      'start-ellipsis',
      pageCount - 4,
      pageCount - 3,
      pageCount - 2,
      pageCount - 1,
      pageCount,
    ];
  }

  return [
    1,
    'start-ellipsis',
    page - 1,
    page,
    page + 1,
    'end-ellipsis',
    pageCount,
  ];
}

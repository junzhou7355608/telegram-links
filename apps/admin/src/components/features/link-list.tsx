import type { LinkResponseDto } from '@/api/types.gen';
import { formatDateTime, statusLabels } from '@/lib/admin-display';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { Checkbox } from '@repo/ui/components/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/table';
import {
  ArrowUpRight,
  ExternalLink,
  FileQuestion,
  Link2,
  Pencil,
} from 'lucide-react';

interface LinkListProps {
  links: LinkResponseDto[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onOpenLink: (linkId: string) => void;
  onResetFilters: () => void;
}

function titleFor(link: LinkResponseDto) {
  return link.domain;
}

function StatusBadges({ link }: { link: LinkResponseDto }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge variant={link.status === 'pending' ? 'secondary' : 'outline'}>
        {statusLabels[link.status]}
      </Badge>
      {link.category ? (
        <Badge variant="outline">{link.category.name}</Badge>
      ) : null}
      {link.tags.map((tag) => (
        <Badge key={tag.id} variant="outline">
          {tag.name}
        </Badge>
      ))}
    </div>
  );
}

export function LinkList({
  links,
  selectedIds,
  onSelectionChange,
  onOpenLink,
  onResetFilters,
}: LinkListProps) {
  const allSelected =
    links.length > 0 && links.every((link) => selectedIds.has(link.id));
  const someSelected = links.some((link) => selectedIds.has(link.id));

  function toggleOne(linkId: string) {
    const next = new Set(selectedIds);
    if (next.has(linkId)) {
      next.delete(linkId);
    } else {
      next.add(linkId);
    }
    onSelectionChange(next);
  }

  function toggleAll() {
    onSelectionChange(
      allSelected ? new Set() : new Set(links.map((link) => link.id)),
    );
  }

  if (links.length === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center">
        <span className="flex size-10 items-center justify-center rounded-lg bg-muted">
          <FileQuestion className="size-5" aria-hidden="true" />
        </span>
        <h3 className="mt-4 font-medium">没有找到匹配的链接</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          尝试减少筛选条件，或重置后查看全部记录。
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={onResetFilters}
        >
          重置筛选
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {links.map((link) => (
          <Card
            key={link.id}
            size="sm"
            className="cursor-pointer"
            onClick={() => onOpenLink(link.id)}
          >
            <CardHeader className="grid-cols-[auto_1fr_auto] items-start">
              <div
                className="pt-0.5"
                onClick={(event) => event.stopPropagation()}
              >
                <Checkbox
                  checked={selectedIds.has(link.id)}
                  onCheckedChange={() => toggleOne(link.id)}
                  aria-label={`选择 ${titleFor(link)}`}
                />
              </div>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-1">
                  <CardTitle className="min-w-0 truncate font-mono">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      title={link.url}
                      className="block truncate no-underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {link.domain}
                    </a>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="shrink-0"
                    nativeButton={false}
                    render={
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        title="打开链接"
                        aria-label={`打开 ${titleFor(link)}`}
                        onClick={(event) => event.stopPropagation()}
                      />
                    }
                  >
                    <ExternalLink />
                  </Button>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`编辑 ${titleFor(link)}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenLink(link.id);
                }}
              >
                <Pencil />
              </Button>
            </CardHeader>
            <CardContent className="grid gap-3">
              <StatusBadges link={link} />
              <dl className="grid grid-cols-[4rem_1fr] gap-x-3 gap-y-1 text-xs">
                <dt className="text-muted-foreground">分类</dt>
                <dd>{link.category?.name ?? '未设置'}</dd>
                <dt className="text-muted-foreground">标签</dt>
                <dd>{link.tags.map((tag) => tag.name).join('、') || '未设置'}</dd>
                <dt className="text-muted-foreground">来源</dt>
                <dd className="truncate">
                  {link.latestSource?.chatName ?? '—'}
                </dd>
              </dl>
            </CardContent>
            <CardFooter className="justify-between text-xs text-muted-foreground">
              <span>{formatDateTime(link.createdAt)}</span>
              <span className="flex items-center gap-1">
                查看详情
                <ArrowUpRight className="size-3" />
              </span>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-xl border md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10 pl-4">
                <Checkbox
                  checked={allSelected}
                  indeterminate={!allSelected && someSelected}
                  onCheckedChange={toggleAll}
                  aria-label="选择当前页全部链接"
                />
              </TableHead>
              <TableHead className="w-[40%]">链接</TableHead>
              <TableHead className="w-32">分类</TableHead>
              <TableHead className="hidden w-48 lg:table-cell">标签</TableHead>
              <TableHead className="hidden w-36 xl:table-cell">来源</TableHead>
              <TableHead className="w-24">状态</TableHead>
              <TableHead className="w-16 pr-4 text-right">
                <span className="sr-only">操作</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.map((link) => (
              <TableRow
                key={link.id}
                tabIndex={0}
                aria-label={`编辑 ${titleFor(link)}`}
                className="cursor-pointer focus-visible:bg-muted focus-visible:outline-none"
                data-state={selectedIds.has(link.id) ? 'selected' : undefined}
                onClick={() => onOpenLink(link.id)}
                onKeyDown={(event) => {
                  if (
                    event.target === event.currentTarget &&
                    (event.key === 'Enter' || event.key === ' ')
                  ) {
                    event.preventDefault();
                    onOpenLink(link.id);
                  }
                }}
              >
                <TableCell
                  className="pl-4"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Checkbox
                    checked={selectedIds.has(link.id)}
                    onCheckedChange={() => toggleOne(link.id)}
                    aria-label={`选择 ${titleFor(link)}`}
                  />
                </TableCell>
                <TableCell className="min-w-0 py-3 whitespace-normal">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/50">
                      <Link2 className="size-3.5" aria-hidden="true" />
                    </span>
                    <div className="flex min-w-0 items-center gap-1">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        title={link.url}
                        className="min-w-0 truncate rounded-sm font-mono font-medium no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {link.domain}
                      </a>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="shrink-0"
                        nativeButton={false}
                        render={
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            title="打开链接"
                            aria-label={`打开 ${titleFor(link)}`}
                            onClick={(event) => event.stopPropagation()}
                          />
                        }
                      >
                        <ExternalLink />
                      </Button>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{link.category?.name ?? '—'}</TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {link.tags.length > 0
                      ? link.tags.map((tag) => (
                          <Badge key={tag.id} variant="outline">
                            {tag.name}
                          </Badge>
                        ))
                      : '—'}
                  </div>
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  <p className="truncate">
                    {link.latestSource?.chatName ?? '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(link.createdAt)}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      link.status === 'pending' ? 'secondary' : 'outline'
                    }
                  >
                    {statusLabels[link.status]}
                  </Badge>
                </TableCell>
                <TableCell className="pr-4 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`编辑 ${titleFor(link)}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenLink(link.id);
                    }}
                  >
                    <Pencil />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

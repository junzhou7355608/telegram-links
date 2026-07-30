import {
  environmentLabels,
  formatDateTime,
  statusLabels,
} from '@/lib/admin-store';
import type { ManagedLinkMock } from '@/types/admin';
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
import { ArrowUpRight, FileQuestion, Pencil } from 'lucide-react';

interface LinkListProps {
  links: ManagedLinkMock[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onOpenLink: (link: ManagedLinkMock) => void;
  onResetFilters: () => void;
}

function titleFor(link: ManagedLinkMock) {
  return link.title || '未命名链接';
}

function StatusBadges({ link }: { link: ManagedLinkMock }) {
  return (
    <div className="flex flex-wrap gap-1">
      <Badge variant={link.status === 'pending' ? 'secondary' : 'outline'}>
        {statusLabels[link.status]}
      </Badge>
      <Badge variant="outline">{environmentLabels[link.environment]}</Badge>
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
    if (allSelected) {
      onSelectionChange(new Set());
      return;
    }
    onSelectionChange(new Set(links.map((link) => link.id)));
  }

  if (links.length === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center">
        <FileQuestion className="size-8 text-muted-foreground" />
        <h3 className="mt-4 font-heading text-base font-medium">
          没有找到匹配的链接
        </h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          尝试减少筛选条件，或重置后查看全部演示记录。
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
            onClick={() => onOpenLink(link)}
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
                <CardTitle
                  className={!link.title ? 'text-muted-foreground' : ''}
                >
                  {titleFor(link)}
                </CardTitle>
                <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                  {link.domain}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`编辑 ${titleFor(link)}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenLink(link);
                }}
              >
                <Pencil />
              </Button>
            </CardHeader>
            <CardContent>
              <StatusBadges link={link} />
              <dl className="mt-3 grid grid-cols-[4rem_1fr] gap-x-3 gap-y-1 text-xs">
                <dt className="text-muted-foreground">项目</dt>
                <dd>{link.project || '未设置'}</dd>
                <dt className="text-muted-foreground">分类</dt>
                <dd>{link.category || '未设置'}</dd>
                <dt className="text-muted-foreground">来源</dt>
                <dd className="truncate">{link.source.chatName}</dd>
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
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  indeterminate={!allSelected && someSelected}
                  onCheckedChange={toggleAll}
                  aria-label="选择当前页全部链接"
                />
              </TableHead>
              <TableHead>链接</TableHead>
              <TableHead className="w-28">项目</TableHead>
              <TableHead className="hidden w-28 lg:table-cell">分类</TableHead>
              <TableHead className="w-24">环境</TableHead>
              <TableHead className="hidden w-36 xl:table-cell">来源</TableHead>
              <TableHead className="w-24">状态</TableHead>
              <TableHead className="w-16">
                <span className="sr-only">操作</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.map((link) => (
              <TableRow
                key={link.id}
                className="cursor-pointer"
                data-state={selectedIds.has(link.id) ? 'selected' : undefined}
                onClick={() => onOpenLink(link)}
              >
                <TableCell onClick={(event) => event.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(link.id)}
                    onCheckedChange={() => toggleOne(link.id)}
                    aria-label={`选择 ${titleFor(link)}`}
                  />
                </TableCell>
                <TableCell className="max-w-72">
                  <p
                    className={`truncate font-medium ${
                      link.title ? '' : 'text-muted-foreground'
                    }`}
                  >
                    {titleFor(link)}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                    {link.url}
                  </p>
                </TableCell>
                <TableCell>{link.project || '—'}</TableCell>
                <TableCell className="hidden lg:table-cell">
                  {link.category || '—'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {environmentLabels[link.environment]}
                  </Badge>
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  <p className="truncate">{link.source.chatName}</p>
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
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`编辑 ${titleFor(link)}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenLink(link);
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

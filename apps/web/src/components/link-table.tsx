import { Button } from '@repo/ui/components/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@repo/ui/components/tooltip';
import {
  Copy,
  ExternalLink,
  Link2,
  MessageSquareText,
  Star,
} from 'lucide-react';
import {
  CategoryBadge,
  EnvironmentBadge,
  StatusBadge,
} from '@/components/link-badges';
import { formatCapturedAt, type TelegramLinkMock } from '@/data/links';

interface LinkTableProps {
  links: readonly TelegramLinkMock[];
  onSelect: (link: TelegramLinkMock) => void;
  onCopy: (link: TelegramLinkMock) => void;
  onToggleFavorite: (link: TelegramLinkMock) => void;
}

export function LinkTable({
  links,
  onSelect,
  onCopy,
  onToggleFavorite,
}: LinkTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[38%] pl-4">链接</TableHead>
            <TableHead>项目</TableHead>
            <TableHead>环境</TableHead>
            <TableHead className="hidden xl:table-cell">分类与标签</TableHead>
            <TableHead className="hidden 2xl:table-cell">来源</TableHead>
            <TableHead>状态</TableHead>
            <TableHead className="w-28 pr-4 text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {links.map((link) => (
            <TableRow
              key={link.id}
              tabIndex={0}
              aria-label={`查看 ${link.title} 的详情`}
              className="cursor-pointer focus-visible:bg-muted focus-visible:outline-none"
              onClick={() => onSelect(link)}
              onKeyDown={(event) => {
                if (
                  event.target === event.currentTarget &&
                  (event.key === 'Enter' || event.key === ' ')
                ) {
                  event.preventDefault();
                  onSelect(link);
                }
              }}
            >
              <TableCell className="min-w-0 py-3 pl-4 whitespace-normal">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/50">
                    <Link2 className="size-3.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{link.title}</p>
                    <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                      {link.domain}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="max-w-48 whitespace-normal">
                <p className="truncate text-sm">
                  {link.project ?? '未分配项目'}
                </p>
                <p className="mt-0.5 hidden truncate text-xs text-muted-foreground xl:block">
                  {link.purpose ?? '尚未补充用途'}
                </p>
              </TableCell>
              <TableCell>
                <EnvironmentBadge environment={link.environment} />
              </TableCell>
              <TableCell className="hidden max-w-52 whitespace-normal xl:table-cell">
                <div className="flex flex-wrap gap-1">
                  <CategoryBadge category={link.category} />
                  {link.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="text-xs text-muted-foreground">
                      #{tag}
                    </span>
                  ))}
                </div>
              </TableCell>
              <TableCell className="hidden max-w-48 whitespace-normal 2xl:table-cell">
                <div className="flex items-center gap-1.5 text-xs">
                  <MessageSquareText
                    className="size-3.5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="truncate">{link.source.chatName}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatCapturedAt(link.source.capturedAt)}
                </p>
              </TableCell>
              <TableCell>
                <StatusBadge status={link.status} />
              </TableCell>
              <TableCell className="pr-4">
                <div
                  className="flex justify-end gap-0.5"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={
                            link.isFavorite ? '取消收藏' : '添加到收藏'
                          }
                          onClick={() => onToggleFavorite(link)}
                        />
                      }
                    >
                      <Star
                        className={link.isFavorite ? 'fill-current' : undefined}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      {link.isFavorite ? '取消收藏' : '收藏'}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`复制 ${link.title} 的链接`}
                          onClick={() => onCopy(link)}
                        />
                      }
                    >
                      <Copy />
                    </TooltipTrigger>
                    <TooltipContent>复制链接</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          nativeButton={false}
                          render={
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`打开 ${link.title}`}
                            />
                          }
                        />
                      }
                    >
                      <ExternalLink />
                    </TooltipTrigger>
                    <TooltipContent>在新窗口打开</TooltipContent>
                  </Tooltip>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

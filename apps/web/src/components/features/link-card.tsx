import type { LinkResponseDto } from '@/api/types.gen';
import { CategoryBadge } from '@/components/features/link-badges';
import { displayLinkTitle, formatCapturedAt } from '@/lib/link-display';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { Copy, ExternalLink } from 'lucide-react';

interface LinkCardProps {
  link: LinkResponseDto;
  onSelect: (link: LinkResponseDto) => void;
  onCopy: (link: LinkResponseDto) => void;
}

export function LinkCard({ link, onSelect, onCopy }: LinkCardProps) {
  const title = displayLinkTitle(link);
  return (
    <Card size="sm" className="cursor-pointer" onClick={() => onSelect(link)}>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle className="truncate">
            <button
              type="button"
              className="max-w-full truncate rounded-sm text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              onClick={(event) => {
                event.stopPropagation();
                onSelect(link);
              }}
            >
              {title}
            </button>
          </CardTitle>
          <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
            {link.domain}
          </p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {link.purpose ?? '尚未补充用途'}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <CategoryBadge category={link.category} />
        </div>
        <div className="flex flex-wrap gap-1">
          {link.tags.slice(0, 3).map((tag) => (
            <Badge key={tag.id} variant="ghost">
              #{tag.name}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {link.latestSource ? (
            <>
              来自 {link.latestSource.chatName} ·{' '}
              {formatCapturedAt(link.latestSource.capturedAt)}
            </>
          ) : (
            '暂无来源信息'
          )}
        </p>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            onCopy(link);
          }}
        >
          <Copy data-icon="inline-start" />
          复制
        </Button>
        <Button
          variant="secondary"
          size="sm"
          nativeButton={false}
          render={
            <a
              href={link.url}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
            />
          }
        >
          打开
          <ExternalLink data-icon="inline-end" />
        </Button>
      </CardFooter>
    </Card>
  );
}

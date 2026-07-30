import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { Copy, ExternalLink, Star } from 'lucide-react';
import {
  CategoryBadge,
  EnvironmentBadge,
  StatusBadge,
} from '@/components/link-badges';
import { formatCapturedAt, type TelegramLinkMock } from '@/data/links';

interface LinkCardProps {
  link: TelegramLinkMock;
  onSelect: (link: TelegramLinkMock) => void;
  onCopy: (link: TelegramLinkMock) => void;
  onToggleFavorite: (link: TelegramLinkMock) => void;
}

export function LinkCard({
  link,
  onSelect,
  onCopy,
  onToggleFavorite,
}: LinkCardProps) {
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
              {link.title}
            </button>
          </CardTitle>
          <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
            {link.domain}
          </p>
        </div>
        <CardAction>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={link.isFavorite ? '取消收藏' : '添加到收藏'}
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite(link);
            }}
          >
            <Star className={link.isFavorite ? 'fill-current' : undefined} />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div>
          <p className="text-sm font-medium">{link.project ?? '未分配项目'}</p>
          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
            {link.purpose ?? '尚未补充用途'}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <EnvironmentBadge environment={link.environment} />
          <StatusBadge status={link.status} />
          <CategoryBadge category={link.category} />
        </div>
        <div className="flex flex-wrap gap-1">
          {link.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="ghost">
              #{tag}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          来自 {link.source.chatName} ·{' '}
          {formatCapturedAt(link.source.capturedAt)}
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

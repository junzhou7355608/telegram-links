import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { ScrollArea } from '@repo/ui/components/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@repo/ui/components/sheet';
import { Copy, ExternalLink, MessageSquareText, Star } from 'lucide-react';
import {
  CategoryBadge,
  EnvironmentBadge,
  StatusBadge,
} from '@/components/link-badges';
import { formatCapturedAt, type TelegramLinkMock } from '@/data/links';

interface LinkDetailSheetProps {
  link: TelegramLinkMock | null;
  onOpenChange: (open: boolean) => void;
  onCopy: (link: TelegramLinkMock) => void;
  onToggleFavorite: (link: TelegramLinkMock) => void;
}

export function LinkDetailSheet({
  link,
  onOpenChange,
  onCopy,
  onToggleFavorite,
}: LinkDetailSheetProps) {
  return (
    <Sheet open={Boolean(link)} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-lg!">
        {link ? (
          <>
            <SheetHeader className="border-b p-5 pr-14">
              <div className="mb-2 flex flex-wrap gap-1.5">
                <EnvironmentBadge environment={link.environment} />
                <StatusBadge status={link.status} />
                <CategoryBadge category={link.category} />
              </div>
              <SheetTitle className="text-lg">{link.title}</SheetTitle>
              <SheetDescription className="break-all font-mono text-xs">
                {link.url}
              </SheetDescription>
            </SheetHeader>

            <ScrollArea className="min-h-0 flex-1">
              <div className="grid gap-6 p-5">
                <dl className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-4 gap-y-4 text-sm">
                  <dt className="text-muted-foreground">所属项目</dt>
                  <dd className="font-medium">
                    {link.project ?? '未分配项目'}
                  </dd>

                  <dt className="text-muted-foreground">用途</dt>
                  <dd>{link.purpose ?? '尚未补充用途'}</dd>

                  <dt className="text-muted-foreground">域名</dt>
                  <dd className="break-all font-mono text-xs">{link.domain}</dd>

                  <dt className="text-muted-foreground">采集时间</dt>
                  <dd>{formatCapturedAt(link.source.capturedAt)}</dd>
                </dl>

                <div>
                  <p className="mb-2 text-sm font-medium">标签</p>
                  <div className="flex flex-wrap gap-1.5">
                    {link.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Card size="sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquareText
                        className="size-4"
                        aria-hidden="true"
                      />
                      Telegram 来源
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">聊天</p>
                      <p className="mt-1 font-medium">{link.source.chatName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        原消息摘要
                      </p>
                      <blockquote className="mt-1 border-l-2 pl-3 text-sm leading-6 text-muted-foreground">
                        {link.source.messagePreview}
                      </blockquote>
                    </div>
                    {link.source.messageUrl ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start"
                        nativeButton={false}
                        render={
                          <a
                            href={link.source.messageUrl}
                            target="_blank"
                            rel="noreferrer"
                          />
                        }
                      >
                        打开原消息
                        <ExternalLink data-icon="inline-end" />
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        这条演示记录没有可访问的原消息地址。
                      </p>
                    )}
                  </CardContent>
                </Card>

                <p className="rounded-lg bg-muted p-3 text-xs leading-5 text-muted-foreground">
                  当前页面使用本地演示数据。项目、用途、标签和分类需要在 Admin
                  中维护。
                </p>
              </div>
            </ScrollArea>

            <SheetFooter className="flex-row border-t">
              <Button
                variant="outline"
                size="icon"
                aria-label={link.isFavorite ? '取消收藏' : '添加到收藏'}
                onClick={() => onToggleFavorite(link)}
              >
                <Star
                  className={link.isFavorite ? 'fill-current' : undefined}
                />
              </Button>
              <Button variant="outline" onClick={() => onCopy(link)}>
                <Copy data-icon="inline-start" />
                复制链接
              </Button>
              <Button
                className="flex-1"
                nativeButton={false}
                render={<a href={link.url} target="_blank" rel="noreferrer" />}
              >
                打开链接
                <ExternalLink data-icon="inline-end" />
              </Button>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

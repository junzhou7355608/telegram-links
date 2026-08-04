import type { LinkResponseDto } from '@/api/types.gen';
import { CategoryBadge } from '@/components/features/link-badges';
import { ApiErrorState, PageSkeleton } from '@/components/layouts/api-state';
import { displayLinkTitle, formatCapturedAt } from '@/lib/link-display';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { LinkFavicon } from '@repo/ui/components/link-favicon';
import { ScrollArea } from '@repo/ui/components/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@repo/ui/components/sheet';
import { Copy, ExternalLink, Link2, MessageSquareText } from 'lucide-react';

interface LinkDetailSheetProps {
  error: unknown;
  isPending: boolean;
  link?: LinkResponseDto;
  open: boolean;
  onCopyUrl: (url: string) => void;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
}

export function LinkDetailSheet({
  error,
  isPending,
  link,
  open,
  onCopyUrl,
  onOpenChange,
  onRetry,
}: LinkDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-xl!">
        {isPending ? (
          <>
            <SheetHeader className="sr-only">
              <SheetTitle>正在加载链接详情</SheetTitle>
              <SheetDescription>
                正在从 Server 读取链接及来源。
              </SheetDescription>
            </SheetHeader>
            <div className="p-5">
              <PageSkeleton rows={6} />
            </div>
          </>
        ) : error ? (
          <>
            <SheetHeader className="sr-only">
              <SheetTitle>无法加载链接详情</SheetTitle>
              <SheetDescription>可以重试或关闭详情。</SheetDescription>
            </SheetHeader>
            <div className="p-5">
              <ApiErrorState error={error} onRetry={onRetry} />
            </div>
          </>
        ) : link ? (
          <>
            <SheetHeader className="border-b p-5 pr-14">
              <div className="mb-2 flex flex-wrap gap-1.5">
                <CategoryBadge category={link.category} />
              </div>
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
                <LinkFavicon url={link.url} size="lg" />
                <div className="min-w-0">
                  <SheetTitle className="text-lg">
                    {displayLinkTitle(link)}
                  </SheetTitle>
                  <SheetDescription className="mt-1 break-all font-mono text-xs">
                    {link.url}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <ScrollArea className="min-h-0 flex-1">
              <div className="grid gap-6 p-5">
                <dl className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-4 gap-y-4 text-sm">
                  <dt className="text-muted-foreground">分类</dt>
                  <dd className="font-medium">
                    {link.category?.name ?? '未分类'}
                  </dd>

                  <dt className="text-muted-foreground">用途</dt>
                  <dd>{link.purpose ?? '尚未补充用途'}</dd>

                  <dt className="text-muted-foreground">域名</dt>
                  <dd className="break-all font-mono text-xs">{link.domain}</dd>

                  <dt className="text-muted-foreground">首次采集</dt>
                  <dd>{formatCapturedAt(link.firstDiscoveredAt)}</dd>
                </dl>

                <div>
                  <p className="mb-2 text-sm font-medium">标签</p>
                  {link.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {link.tags.map((tag) => (
                        <Badge key={tag.id} variant="secondary">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      尚未添加标签
                    </p>
                  )}
                </div>

                <section
                  aria-labelledby="source-heading"
                  className="grid gap-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 id="source-heading" className="text-sm font-medium">
                      Telegram 来源
                    </h3>
                    <Badge variant="outline">{link.sourceCount} 条</Badge>
                  </div>
                  {(link.sources ?? []).length > 0 ? (
                    (link.sources ?? []).map((source) => (
                      <Card key={source.id} size="sm">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <MessageSquareText
                              className="size-4"
                              aria-hidden="true"
                            />
                            {source.chatName}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                          <dl className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
                            {source.senderName ? (
                              <>
                                <dt className="text-muted-foreground">
                                  发送者
                                </dt>
                                <dd>{source.senderName}</dd>
                              </>
                            ) : null}
                            <dt className="text-muted-foreground">采集时间</dt>
                            <dd>{formatCapturedAt(source.capturedAt)}</dd>
                            <dt className="text-muted-foreground">完整链接</dt>
                            <dd className="break-all font-mono text-xs">
                              {source.rawUrl}
                            </dd>
                          </dl>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              原消息
                            </p>
                            <blockquote className="mt-1 break-words whitespace-pre-wrap border-l-2 pl-3 text-sm leading-6 text-muted-foreground">
                              {source.messageText ||
                                source.messagePreview ||
                                '没有可展示的消息内容。'}
                            </blockquote>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onCopyUrl(source.rawUrl)}
                            >
                              <Copy />
                              复制完整链接
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              nativeButton={false}
                              render={
                                <a
                                  href={source.rawUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                />
                              }
                            >
                              <Link2 />
                              打开完整链接
                            </Button>
                            {source.messageUrl ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                nativeButton={false}
                                render={
                                  <a
                                    href={source.messageUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                  />
                                }
                              >
                                打开原消息
                                <ExternalLink data-icon="inline-end" />
                              </Button>
                            ) : null}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card size="sm">
                      <CardContent className="text-sm text-muted-foreground">
                        暂无可展示的 Telegram 来源。
                      </CardContent>
                    </Card>
                  )}
                </section>
              </div>
            </ScrollArea>

            <SheetFooter className="flex-row border-t">
              <Button variant="outline" onClick={() => onCopyUrl(link.url)}>
                <Copy data-icon="inline-start" />
                复制主链接
              </Button>
              <Button
                className="flex-1"
                nativeButton={false}
                render={<a href={link.url} target="_blank" rel="noreferrer" />}
              >
                打开主链接
                <ExternalLink data-icon="inline-end" />
              </Button>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

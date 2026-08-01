import type { LinkResponseDto } from '@/api/types.gen';
import {
  CategoryBadge,
  EnvironmentBadge,
  StatusBadge,
} from '@/components/features/link-badges';
import { formatCapturedAt } from '@/lib/link-display';
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
import { Copy, ExternalLink, MessageSquareText } from 'lucide-react';

interface LinkDetailSheetProps {
  link: LinkResponseDto | null;
  title?: string;
  onOpenChange: (open: boolean) => void;
  onCopy: (link: LinkResponseDto) => void;
}

export function LinkDetailSheet({
  link,
  title,
  onOpenChange,
  onCopy,
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
              <SheetTitle className="text-lg">{title}</SheetTitle>
              <SheetDescription className="break-all font-mono text-xs">
                {link.url}
              </SheetDescription>
            </SheetHeader>

            <ScrollArea className="min-h-0 flex-1">
              <div className="grid gap-6 p-5">
                <dl className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-4 gap-y-4 text-sm">
                  <dt className="text-muted-foreground">所属项目</dt>
                  <dd className="font-medium">
                    {link.project?.name ?? '未分配项目'}
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

                {(link.sources ?? []).length > 0 ? (
                  (link.sources ?? []).map((source) => (
                    <Card key={source.id} size="sm">
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
                          <p className="mt-1 font-medium">{source.chatName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            原消息摘要
                          </p>
                          <blockquote className="mt-1 border-l-2 pl-3 text-sm leading-6 text-muted-foreground">
                            {source.messagePreview || '没有可展示的消息摘要。'}
                          </blockquote>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          采集于 {formatCapturedAt(source.capturedAt)}
                        </p>
                        {source.messageUrl ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="justify-start"
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
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card size="sm">
                    <CardContent className="text-sm text-muted-foreground">
                      这条演示记录暂无可展示的 Telegram 来源。
                    </CardContent>
                  </Card>
                )}

                <p className="rounded-lg bg-muted p-3 text-xs leading-5 text-muted-foreground">
                  当前页面使用本地演示数据。项目、用途、标签和分类需要在 Admin
                  中维护。
                </p>
              </div>
            </ScrollArea>

            <SheetFooter className="flex-row border-t">
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

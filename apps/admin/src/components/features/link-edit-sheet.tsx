import type {
  AdminLinkResponseDto,
  UpdateLinkDto,
} from '@/api/types.gen';
import { TagPicker } from '@/components/features/tag-picker';
import type { TaxonomyCollections } from '@/lib/admin-api';
import { formatDateTime, isValidHttpUrl } from '@/lib/admin-display';
import { getAdminApiError } from '@/lib/api-error';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui/components/alert-dialog';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@repo/ui/components/field';
import { Input } from '@repo/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@repo/ui/components/sheet';
import { Textarea } from '@repo/ui/components/textarea';
import {
  Archive,
  Copy,
  ExternalLink,
  LoaderCircle,
  MessageCircle,
  RotateCcw,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface LinkDraft {
  categoryId: string;
  purpose: string;
  tagIds: string[];
  title: string;
  url: string;
}

interface LinkEditSheetProps {
  isPending: boolean;
  link: AdminLinkResponseDto;
  taxonomy: TaxonomyCollections;
  onArchive: () => Promise<void>;
  onOpenChange: (open: boolean) => void;
  onRestore: () => Promise<void>;
  onSave: (body: UpdateLinkDto) => Promise<void>;
}

export function LinkEditSheet({
  isPending,
  link,
  taxonomy,
  onArchive,
  onOpenChange,
  onRestore,
  onSave,
}: LinkEditSheetProps) {
  const [draft, setDraft] = useState<LinkDraft>({
    categoryId: link.category?.id ?? '',
    purpose: link.purpose ?? '',
    tagIds: link.tags.map((tag) => tag.id),
    title: link.title,
    url: link.url,
  });
  const [error, setError] = useState('');
  const [archiveOpen, setArchiveOpen] = useState(false);

  function update<Key extends keyof LinkDraft>(
    key: Key,
    value: LinkDraft[Key],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function save(status: AdminLinkResponseDto['status']) {
    const body: UpdateLinkDto = {
      categoryId: draft.categoryId || null,
      purpose: draft.purpose.trim() || null,
      status,
      tagIds: draft.tagIds,
      title: draft.title.trim(),
      url: draft.url.trim(),
    };

    if (!isValidHttpUrl(body.url ?? '')) {
      setError('URL 必须是有效的 HTTP 或 HTTPS 地址。');
      return;
    }
    if (
      status === 'organized' &&
      (!body.title || !body.purpose || !body.categoryId)
    ) {
      setError('完成整理前，请填写标题、合法 URL、用途和分类。');
      return;
    }

    setError('');
    try {
      await onSave(body);
      toast.success(status === 'organized' ? '已保存并完成整理' : '草稿已保存');
      onOpenChange(false);
    } catch (caught) {
      setError(getAdminApiError(caught).message);
    }
  }

  async function archive() {
    try {
      await onArchive();
      toast.success('链接已归档');
      setArchiveOpen(false);
      onOpenChange(false);
    } catch (caught) {
      toast.error(getAdminApiError(caught).message);
    }
  }

  async function restore() {
    try {
      await onRestore();
      toast.success('链接已恢复');
    } catch (caught) {
      toast.error(getAdminApiError(caught).message);
    }
  }

  async function copyUrl(value = draft.url) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('链接已复制');
    } catch {
      toast.error('复制失败，请手动复制');
    }
  }

  const sources =
    link.sources ?? (link.latestSource ? [link.latestSource] : []);

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-hidden p-0 sm:w-[88vw]! sm:max-w-3xl!"
      >
        <SheetHeader className="flex-none border-b">
          <div className="flex flex-wrap items-center gap-2 pr-8">
            <SheetTitle>整理链接</SheetTitle>
            <Badge
              variant={link.status === 'pending' ? 'secondary' : 'outline'}
            >
              {link.status === 'pending' ? '待整理' : '已整理'}
            </Badge>
            {link.archivedAt ? (
              <Badge variant="destructive">已归档</Badge>
            ) : null}
          </div>
          <SheetDescription>
            使用分类和标签整理链接；Telegram 来源上下文保持只读。
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-6 px-4 py-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="edit-title">标题</FieldLabel>
                <Input
                  id="edit-title"
                  value={draft.title}
                  disabled={isPending}
                  onChange={(event) => update('title', event.target.value)}
                  placeholder="例如：Atlas 正式站"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-url">主链接</FieldLabel>
                <Input
                  id="edit-url"
                  value={draft.url}
                  disabled={isPending}
                  onChange={(event) => update('url', event.target.value)}
                  className="font-mono text-xs"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void copyUrl()}
                  >
                    <Copy />
                    复制
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!isValidHttpUrl(draft.url)}
                    onClick={() =>
                      window.open(draft.url, '_blank', 'noopener,noreferrer')
                    }
                  >
                    <ExternalLink />
                    打开链接
                  </Button>
                </div>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="edit-category">分类</FieldLabel>
                  <Select
                    value={draft.categoryId || 'none'}
                    disabled={isPending}
                    onValueChange={(value) =>
                      update(
                        'categoryId',
                        value === 'none' ? '' : String(value),
                      )
                    }
                  >
                    <SelectTrigger id="edit-category" className="w-full">
                      <SelectValue>
                        {(value) =>
                          value === 'none'
                            ? '未设置'
                            : (taxonomy.categories.find(
                                (item) => item.id === value,
                              )?.name ?? '未知分类')
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">未设置</SelectItem>
                      {taxonomy.categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-tags">标签</FieldLabel>
                  <TagPicker
                    id="edit-tags"
                    options={taxonomy.tags}
                    value={draft.tagIds}
                    onChange={(tagIds) => update('tagIds', tagIds)}
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="edit-purpose">用途</FieldLabel>
                <Textarea
                  id="edit-purpose"
                  value={draft.purpose}
                  disabled={isPending}
                  onChange={(event) => update('purpose', event.target.value)}
                  placeholder="这个链接用来做什么？"
                  rows={3}
                />
              </Field>
              {error ? <FieldError>{error}</FieldError> : null}
              <FieldDescription>
                保存草稿允许字段不完整；标记完成时会检查标题、URL、用途和分类。
              </FieldDescription>
            </FieldGroup>

            <section
              aria-labelledby="source-heading"
              className="rounded-xl border"
            >
              <div className="border-b px-4 py-3">
                <h3 id="source-heading" className="font-medium">
                  Telegram 来源（{link.sourceCount}）
                </h3>
              </div>
              {sources.length > 0 ? (
                <div className="divide-y">
                  {sources.map((source) => (
                    <div key={source.id} className="space-y-3 p-4 text-sm">
                      <dl className="grid grid-cols-[5rem_1fr] gap-x-3 gap-y-2">
                        <dt className="text-muted-foreground">聊天</dt>
                        <dd>{source.chatName}</dd>
                        <dt className="text-muted-foreground">采集时间</dt>
                        <dd>{formatDateTime(source.capturedAt)}</dd>
                        <dt className="text-muted-foreground">完整链接</dt>
                        <dd className="break-all font-mono text-xs">
                          {source.rawUrl}
                        </dd>
                        <dt className="text-muted-foreground">原消息</dt>
                        <dd className="leading-relaxed">
                          {source.messageText ?? source.messagePreview}
                        </dd>
                      </dl>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void copyUrl(source.rawUrl)}
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
                          <ExternalLink />
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
                            <MessageCircle />
                            打开原消息
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="p-4 text-sm text-muted-foreground">
                  暂无来源信息
                </p>
              )}
            </section>
          </div>
        </div>

        <SheetFooter className="flex-none flex-row border-t bg-background">
          {link.archivedAt ? (
            <Button type="button" disabled={isPending} onClick={restore}>
              {isPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <RotateCcw />
              )}
              恢复链接
            </Button>
          ) : (
            <>
              <Button
                type="button"
                disabled={isPending}
                onClick={() => void save('organized')}
              >
                {isPending ? <LoaderCircle className="animate-spin" /> : null}
                保存并完成
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => void save(link.status)}
              >
                保存草稿
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={isPending}
                className="sm:ml-auto"
                onClick={() => setArchiveOpen(true)}
              >
                <Archive />
                归档
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>归档这个链接？</AlertDialogTitle>
            <AlertDialogDescription>
              归档后默认不会出现在列表中，可以通过“包含归档”筛选后恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={() => void archive()}
            >
              归档
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}

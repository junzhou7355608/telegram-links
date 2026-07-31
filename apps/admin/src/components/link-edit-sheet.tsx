import {
  canCompleteLink,
  environmentLabels,
  formatDateTime,
  getDomain,
  isValidHttpUrl,
} from '@/lib/admin-store';
import type {
  AdminTaxonomyState,
  LinkEnvironment,
  ManagedLinkMock,
} from '@/types/admin';
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
import { Copy, ExternalLink, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { TagPicker } from '@/components/tag-picker';

interface LinkEditSheetProps {
  link: ManagedLinkMock;
  taxonomy: AdminTaxonomyState;
  onOpenChange: (open: boolean) => void;
  onSave: (link: ManagedLinkMock) => void;
}

export function LinkEditSheet({
  link,
  taxonomy,
  onOpenChange,
  onSave,
}: LinkEditSheetProps) {
  const [draft, setDraft] = useState(link);
  const [error, setError] = useState('');

  function update<Key extends keyof ManagedLinkMock>(
    key: Key,
    value: ManagedLinkMock[Key],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function save(status: 'pending' | 'organized') {
    const next: ManagedLinkMock = {
      ...draft,
      title: draft.title.trim(),
      url: draft.url.trim(),
      domain: getDomain(draft.url.trim()),
      project: draft.project.trim(),
      purpose: draft.purpose.trim(),
      category: draft.category.trim(),
      status,
      updatedAt: new Date().toISOString(),
    };

    if (status === 'organized' && !canCompleteLink(next)) {
      setError('完成整理前，请填写标题、合法 URL、项目、用途和分类。');
      return;
    }
    if (next.url && !isValidHttpUrl(next.url)) {
      setError('URL 必须是有效的 HTTP 或 HTTPS 地址。');
      return;
    }

    setError('');
    onSave(next);
    onOpenChange(false);
    toast.success(status === 'organized' ? '已保存并完成整理' : '草稿已保存');
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(draft.url);
      toast.success('链接已复制');
    } catch {
      toast.error('复制失败，请手动复制');
    }
  }

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="border-b">
          <div className="flex flex-wrap items-center gap-2 pr-8">
            <SheetTitle>整理链接</SheetTitle>
            <Badge
              variant={draft.status === 'pending' ? 'secondary' : 'outline'}
            >
              {draft.status === 'pending' ? '待整理' : '已整理'}
            </Badge>
          </div>
          <SheetDescription>
            编辑链接属性；Telegram 来源上下文保持只读。
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-title">标题</FieldLabel>
              <Input
                id="edit-title"
                value={draft.title}
                onChange={(event) => update('title', event.target.value)}
                placeholder="例如：Atlas 正式站"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-url">URL</FieldLabel>
              <Input
                id="edit-url"
                value={draft.url}
                onChange={(event) => update('url', event.target.value)}
                className="font-mono text-xs"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyUrl}
                >
                  <Copy />
                  复制
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={
                    <a
                      href={draft.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-disabled={!isValidHttpUrl(draft.url)}
                    />
                  }
                >
                  <ExternalLink />
                  打开链接
                </Button>
              </div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="edit-project">项目</FieldLabel>
                <Select
                  value={draft.project || 'none'}
                  onValueChange={(value) =>
                    update('project', value === 'none' ? '' : String(value))
                  }
                >
                  <SelectTrigger id="edit-project" className="w-full">
                    <SelectValue>
                      {(value) => (value === 'none' ? '未设置' : String(value))}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">未设置</SelectItem>
                    {taxonomy.projects.map((project) => (
                      <SelectItem key={project} value={project}>
                        {project}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-category">分类</FieldLabel>
                <Select
                  value={draft.category || 'none'}
                  onValueChange={(value) =>
                    update('category', value === 'none' ? '' : String(value))
                  }
                >
                  <SelectTrigger id="edit-category" className="w-full">
                    <SelectValue>
                      {(value) => (value === 'none' ? '未设置' : String(value))}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">未设置</SelectItem>
                    {taxonomy.categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="edit-purpose">用途</FieldLabel>
              <Textarea
                id="edit-purpose"
                value={draft.purpose}
                onChange={(event) => update('purpose', event.target.value)}
                placeholder="这个链接属于什么项目，用来做什么？"
                rows={3}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="edit-environment">环境</FieldLabel>
                <Select
                  value={draft.environment}
                  onValueChange={(value) =>
                    update('environment', value as LinkEnvironment)
                  }
                >
                  <SelectTrigger id="edit-environment" className="w-full">
                    <SelectValue>
                      {(value) =>
                        environmentLabels[
                          value as keyof typeof environmentLabels
                        ]
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(environmentLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
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
                  value={draft.tags}
                  onChange={(tags) => update('tags', tags)}
                />
              </Field>
            </div>
            {error ? <FieldError>{error}</FieldError> : null}
            <FieldDescription>
              保存草稿允许字段不完整；标记完成时会检查必填项。
            </FieldDescription>
          </FieldGroup>

          <section
            aria-labelledby="source-heading"
            className="rounded-xl border"
          >
            <div className="border-b px-4 py-3">
              <h3 id="source-heading" className="font-heading font-medium">
                Telegram 来源
              </h3>
            </div>
            <dl className="grid grid-cols-[5rem_1fr] gap-x-3 gap-y-3 p-4 text-sm">
              <dt className="text-muted-foreground">聊天</dt>
              <dd>{draft.source.chatName}</dd>
              <dt className="text-muted-foreground">采集时间</dt>
              <dd>{formatDateTime(draft.source.capturedAt)}</dd>
              <dt className="text-muted-foreground">原消息</dt>
              <dd className="leading-relaxed">{draft.source.messagePreview}</dd>
            </dl>
            {draft.source.messageUrl ? (
              <div className="border-t p-3">
                <Button
                  variant="ghost"
                  size="sm"
                  nativeButton={false}
                  render={
                    <a
                      href={draft.source.messageUrl}
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                >
                  <MessageCircle />
                  打开原消息
                </Button>
              </div>
            ) : null}
          </section>
        </div>

        <SheetFooter className="sticky bottom-0 border-t bg-background">
          <Button type="button" onClick={() => save('organized')}>
            保存并完成
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => save(draft.status)}
          >
            保存草稿
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

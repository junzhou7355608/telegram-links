import type {
  AdminLinkResponseDto,
  ApplyAiSuggestionsDto,
  UpdateLinkDto,
} from '@/api/types.gen';
import { TagPicker } from '@/components/features/tag-picker';
import {
  environmentLabels,
  formatDateTime,
  isValidHttpUrl,
} from '@/lib/admin-display';
import type { TaxonomyCollections } from '@/lib/admin-api';
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
import { Checkbox } from '@repo/ui/components/checkbox';
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
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface LinkDraft {
  categoryId: string;
  environment: AdminLinkResponseDto['environment'];
  projectId: string;
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
  onApplyAiSuggestions: (body: ApplyAiSuggestionsDto) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  onRestore: () => Promise<void>;
  onSave: (body: UpdateLinkDto) => Promise<void>;
}

export function LinkEditSheet({
  isPending,
  link,
  taxonomy,
  onArchive,
  onApplyAiSuggestions,
  onOpenChange,
  onRestore,
  onSave,
}: LinkEditSheetProps) {
  const [draft, setDraft] = useState<LinkDraft>({
    categoryId: link.category?.id ?? '',
    environment: link.environment,
    projectId: link.project?.id ?? '',
    purpose: link.purpose ?? '',
    tagIds: link.tags.map((tag) => tag.id),
    title: link.title,
    url: link.url,
  });
  const [error, setError] = useState('');
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [applyProject, setApplyProject] = useState(
    Boolean(link.aiAnalysis?.suggestedProjectName),
  );
  const [applyCategory, setApplyCategory] = useState(
    Boolean(link.aiAnalysis?.suggestedCategoryName),
  );
  const [suggestedTagNames, setSuggestedTagNames] = useState(
    link.aiAnalysis?.suggestedTagNames ?? [],
  );

  function update<Key extends keyof LinkDraft>(
    key: Key,
    value: LinkDraft[Key],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function save(status: AdminLinkResponseDto['status']) {
    const body: UpdateLinkDto = {
      categoryId: draft.categoryId || null,
      environment: draft.environment,
      projectId: draft.projectId || null,
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
      (!body.title || !body.projectId || !body.purpose || !body.categoryId)
    ) {
      setError('完成整理前，请填写标题、合法 URL、项目、用途和分类。');
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

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(draft.url);
      toast.success('链接已复制');
    } catch {
      toast.error('复制失败，请手动复制');
    }
  }

  async function applySuggestions() {
    const analysis = link.aiAnalysis;
    if (!analysis) {
      return;
    }
    try {
      await onApplyAiSuggestions({
        analysisId: analysis.id,
        applyCategory,
        applyProject,
        tagNames: suggestedTagNames,
      });
      toast.success('AI 新词建议已应用');
    } catch (caught) {
      toast.error(getAdminApiError(caught).message);
    }
  }

  const sources =
    link.sources ?? (link.latestSource ? [link.latestSource] : []);

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="border-b">
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
                disabled={isPending}
                onChange={(event) => update('title', event.target.value)}
                placeholder="例如：Atlas 正式站"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-url">URL</FieldLabel>
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
                  onClick={copyUrl}
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
                <FieldLabel htmlFor="edit-project">项目</FieldLabel>
                <Select
                  value={draft.projectId || 'none'}
                  disabled={isPending}
                  onValueChange={(value) =>
                    update('projectId', value === 'none' ? '' : String(value))
                  }
                >
                  <SelectTrigger id="edit-project" className="w-full">
                    <SelectValue>
                      {(value) =>
                        value === 'none'
                          ? '未设置'
                          : (taxonomy.projects.find((item) => item.id === value)
                              ?.name ?? '未知项目')
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">未设置</SelectItem>
                    {taxonomy.projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-category">分类</FieldLabel>
                <Select
                  value={draft.categoryId || 'none'}
                  disabled={isPending}
                  onValueChange={(value) =>
                    update('categoryId', value === 'none' ? '' : String(value))
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
            </div>

            <Field>
              <FieldLabel htmlFor="edit-purpose">用途</FieldLabel>
              <Textarea
                id="edit-purpose"
                value={draft.purpose}
                disabled={isPending}
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
                  disabled={isPending}
                  onValueChange={(value) =>
                    update(
                      'environment',
                      String(value) as AdminLinkResponseDto['environment'],
                    )
                  }
                >
                  <SelectTrigger id="edit-environment" className="w-full">
                    <SelectValue>
                      {(value) =>
                        environmentLabels[
                          value as AdminLinkResponseDto['environment']
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
                  value={draft.tagIds}
                  onChange={(tagIds) => update('tagIds', tagIds)}
                />
              </Field>
            </div>
            {error ? <FieldError>{error}</FieldError> : null}
            <FieldDescription>
              保存草稿允许待整理链接字段不完整；标记完成时会检查必填项。
            </FieldDescription>
          </FieldGroup>

          {link.aiAnalysis ? (
            <section
              aria-labelledby="ai-analysis-heading"
              className="rounded-xl border"
            >
              <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
                <div>
                  <h3
                    id="ai-analysis-heading"
                    className="flex items-center gap-2 font-medium"
                  >
                    <Sparkles className="size-4" />
                    AI 识别
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {link.aiAnalysis.model} · 置信度{' '}
                    {Math.round(link.aiAnalysis.confidence * 100)}%
                  </p>
                </div>
                {link.aiAnalysis.appliedAt ? (
                  <Badge variant="outline">建议已应用</Badge>
                ) : null}
              </div>
              <div className="space-y-4 p-4 text-sm">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    识别依据
                  </p>
                  <p className="mt-1 leading-relaxed">
                    {link.aiAnalysis.rationale}
                  </p>
                </div>
                {link.aiAnalysis.suggestedProjectName ||
                link.aiAnalysis.suggestedCategoryName ||
                link.aiAnalysis.suggestedTagNames.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      新基础资料建议（确认后创建或复用）
                    </p>
                    {link.aiAnalysis.suggestedProjectName ? (
                      <label className="flex items-center gap-2">
                        <Checkbox
                          checked={applyProject}
                          disabled={isPending}
                          onCheckedChange={(checked) =>
                            setApplyProject(checked === true)
                          }
                        />
                        项目：{link.aiAnalysis.suggestedProjectName}
                      </label>
                    ) : null}
                    {link.aiAnalysis.suggestedCategoryName ? (
                      <label className="flex items-center gap-2">
                        <Checkbox
                          checked={applyCategory}
                          disabled={isPending}
                          onCheckedChange={(checked) =>
                            setApplyCategory(checked === true)
                          }
                        />
                        分类：{link.aiAnalysis.suggestedCategoryName}
                      </label>
                    ) : null}
                    {link.aiAnalysis.suggestedTagNames.map((name) => (
                      <label key={name} className="flex items-center gap-2">
                        <Checkbox
                          checked={suggestedTagNames.includes(name)}
                          disabled={isPending}
                          onCheckedChange={(checked) =>
                            setSuggestedTagNames((current) =>
                              checked === true
                                ? [...new Set([...current, name])]
                                : current.filter((value) => value !== name),
                            )
                          }
                        />
                        标签：{name}
                      </label>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => void applySuggestions()}
                    >
                      {isPending ? (
                        <LoaderCircle className="animate-spin" />
                      ) : (
                        <Sparkles />
                      )}
                      应用所选建议
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    已有基础资料已自动应用，没有需要创建的新词。
                  </p>
                )}
              </div>
            </section>
          ) : null}

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
                      <dt className="text-muted-foreground">原消息</dt>
                      <dd className="leading-relaxed">
                        {source.messageText ?? source.messagePreview}
                      </dd>
                    </dl>
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
                ))}
              </div>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">暂无来源信息</p>
            )}
          </section>
        </div>

        <SheetFooter className="sticky bottom-0 flex-row border-t bg-background">
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
                onClick={() => save('organized')}
              >
                {isPending ? <LoaderCircle className="animate-spin" /> : null}
                保存并完成
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => save(link.status)}
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

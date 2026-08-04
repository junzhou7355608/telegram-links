import type { CreateLinkDto, TaxonomyItemResponseDto } from '@/api/types.gen';
import { CreatableTaxonomyPicker } from '@/components/features/creatable-taxonomy-picker';
import type { TaxonomyCollections, TaxonomyKind } from '@/lib/admin-api';
import { getAdminApiError } from '@/lib/api-error';
import {
  createLinkSubmission,
  type CreateLinkDraft,
} from '@/lib/create-link-form';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@repo/ui/components/sheet';
import { Textarea } from '@repo/ui/components/textarea';
import { LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface LinkCreateSheetProps {
  isPending: boolean;
  taxonomy: TaxonomyCollections;
  onCreateTaxonomy: (
    kind: TaxonomyKind,
    name: string,
  ) => Promise<TaxonomyItemResponseDto>;
  onOpenChange: (open: boolean) => void;
  onSave: (body: CreateLinkDto) => Promise<void>;
}

export function LinkCreateSheet({
  isPending,
  taxonomy,
  onCreateTaxonomy,
  onOpenChange,
  onSave,
}: LinkCreateSheetProps) {
  const [draft, setDraft] = useState<CreateLinkDraft>({
    categoryId: '',
    purpose: '',
    tagIds: [],
    title: '',
    url: '',
  });
  const [error, setError] = useState('');

  function update<Key extends keyof CreateLinkDraft>(
    key: Key,
    value: CreateLinkDraft[Key],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError('');
  }

  async function save(status: NonNullable<CreateLinkDto['status']>) {
    const submission = createLinkSubmission(draft, status);
    if ('error' in submission) {
      setError(submission.error);
      return;
    }

    setError('');
    try {
      await onSave(submission.body);
      toast.success(
        status === 'organized' ? '链接已新增并完成整理' : '链接草稿已新增',
      );
      onOpenChange(false);
    } catch (caught) {
      setError(getAdminApiError(caught).message);
    }
  }

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-hidden p-0 sm:w-[88vw]! sm:max-w-2xl!"
      >
        <SheetHeader className="flex-none border-b">
          <SheetTitle>新增链接</SheetTitle>
          <SheetDescription>
            手动保存链接，不关联 Telegram 消息来源。
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="px-4 py-4">
            <FieldGroup>
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor="create-link-url">主链接</FieldLabel>
                <Input
                  id="create-link-url"
                  value={draft.url}
                  disabled={isPending}
                  autoFocus
                  autoComplete="url"
                  className="font-mono text-xs"
                  placeholder="https://example.com"
                  required
                  onChange={(event) => update('url', event.target.value)}
                />
              </Field>

              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor="create-link-title">标题</FieldLabel>
                <Input
                  id="create-link-title"
                  value={draft.title}
                  disabled={isPending}
                  placeholder="例如：Atlas 正式站"
                  required
                  onChange={(event) => update('title', event.target.value)}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="create-link-category">分类</FieldLabel>
                  <CreatableTaxonomyPicker
                    id="create-link-category"
                    kind="categories"
                    options={taxonomy.categories}
                    value={draft.categoryId ? [draft.categoryId] : []}
                    disabled={isPending}
                    onChange={(categoryIds) =>
                      update('categoryId', categoryIds[0] ?? '')
                    }
                    onCreate={onCreateTaxonomy}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="create-link-tags">标签</FieldLabel>
                  <CreatableTaxonomyPicker
                    id="create-link-tags"
                    kind="tags"
                    multiple
                    options={taxonomy.tags}
                    value={draft.tagIds}
                    disabled={isPending}
                    onChange={(tagIds) => update('tagIds', tagIds)}
                    onCreate={onCreateTaxonomy}
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="create-link-purpose">用途</FieldLabel>
                <Textarea
                  id="create-link-purpose"
                  value={draft.purpose}
                  disabled={isPending}
                  placeholder="这个链接用来做什么？"
                  rows={3}
                  onChange={(event) => update('purpose', event.target.value)}
                />
              </Field>

              {error ? <FieldError>{error}</FieldError> : null}
              <FieldDescription>
                保存草稿时分类可选；完成整理时必须选择分类。
              </FieldDescription>
            </FieldGroup>
          </div>
        </div>

        <SheetFooter className="flex-none flex-row border-t bg-background">
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
            onClick={() => void save('pending')}
          >
            保存草稿
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

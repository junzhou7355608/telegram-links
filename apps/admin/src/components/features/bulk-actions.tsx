import type { BatchLinkPatchDto, LinkResponseDto } from '@/api/types.gen';
import { TagPicker } from '@/components/features/tag-picker';
import type { TaxonomyCollections } from '@/lib/admin-api';
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
import { Button } from '@repo/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/dialog';
import { Field, FieldGroup, FieldLabel } from '@repo/ui/components/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';
import { Archive, CheckCheck, ListChecks, X } from 'lucide-react';
import { useState } from 'react';

interface BulkActionsProps {
  isPending: boolean;
  selectedLinks: LinkResponseDto[];
  taxonomy: TaxonomyCollections;
  onArchive: () => void;
  onClear: () => void;
  onApply: (patch: BatchLinkPatchDto) => void;
  onComplete: () => void;
}

export function BulkActions({
  isPending,
  selectedLinks,
  taxonomy,
  onArchive,
  onClear,
  onApply,
  onComplete,
}: BulkActionsProps) {
  const [open, setOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [categoryId, setCategoryId] = useState('unchanged');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const archivableCount = selectedLinks.filter(
    (link) => !link.archivedAt,
  ).length;

  if (selectedLinks.length === 0) {
    return null;
  }

  function apply() {
    const patch: BatchLinkPatchDto = { status: 'organized' };
    if (categoryId !== 'unchanged') {
      patch.categoryId = categoryId === 'none' ? null : categoryId;
    }
    if (tagIds.length > 0) {
      patch.addTagIds = tagIds;
    }
    onApply(patch);
    setOpen(false);
  }

  return (
    <>
      <div className="sticky top-16 z-20 flex flex-wrap items-center gap-2 rounded-xl border bg-background/95 p-2 shadow-sm backdrop-blur">
        <p className="mr-auto px-2 text-sm font-medium">
          已选择 {selectedLinks.length} 条
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => setOpen(true)}
        >
          <ListChecks />
          批量设置
        </Button>
        <Button type="button" disabled={isPending} onClick={onComplete}>
          <CheckCheck />
          标记完成
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={isPending || archivableCount === 0}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          title={archivableCount === 0 ? '所选链接均已归档' : undefined}
          onClick={() => setArchiveOpen(true)}
        >
          <Archive />
          批量归档
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="清空选择"
          onClick={onClear}
        >
          <X />
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>批量整理 {selectedLinks.length} 条链接</DialogTitle>
            <DialogDescription>
              设置分类并追加标签；应用后同时将符合条件的链接标记完成。
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="bulk-category">分类</FieldLabel>
                <Select
                  value={categoryId}
                  onValueChange={(value) => setCategoryId(value ?? 'unchanged')}
                >
                  <SelectTrigger id="bulk-category" className="w-full">
                    <SelectValue>
                      {(value) =>
                        value === 'unchanged'
                          ? '保持不变'
                          : value === 'none'
                            ? '清空分类'
                            : (taxonomy.categories.find(
                                (item) => item.id === value,
                              )?.name ?? '未知分类')
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unchanged">保持不变</SelectItem>
                    <SelectItem value="none">清空分类</SelectItem>
                    {taxonomy.categories.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="bulk-tags">追加标签</FieldLabel>
                <TagPicker
                  id="bulk-tags"
                  options={taxonomy.tags}
                  value={tagIds}
                  onChange={setTagIds}
                />
              </Field>
            </div>
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              取消
            </Button>
            <Button type="button" disabled={isPending} onClick={apply}>
              应用并标记完成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>归档 {archivableCount} 条链接？</AlertDialogTitle>
            <AlertDialogDescription>
              归档后默认从列表隐藏，但不会删除链接及 Telegram
              来源。之后可以通过“包含归档”筛选并恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending || archivableCount === 0}
              onClick={() => {
                onArchive();
                setArchiveOpen(false);
              }}
            >
              归档 {archivableCount} 条
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

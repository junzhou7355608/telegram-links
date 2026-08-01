import type { BatchLinkPatchDto, LinkResponseDto } from '@/api/types.gen';
import { TagPicker } from '@/components/features/tag-picker';
import { environmentLabels } from '@/lib/admin-display';
import type { TaxonomyCollections } from '@/lib/admin-api';
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
import { CheckCheck, ListChecks, X } from 'lucide-react';
import { useState } from 'react';

interface BulkActionsProps {
  isPending: boolean;
  selectedLinks: LinkResponseDto[];
  taxonomy: TaxonomyCollections;
  onClear: () => void;
  onApply: (patch: BatchLinkPatchDto) => void;
  onComplete: () => void;
}

export function BulkActions({
  isPending,
  selectedLinks,
  taxonomy,
  onClear,
  onApply,
  onComplete,
}: BulkActionsProps) {
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState('unchanged');
  const [categoryId, setCategoryId] = useState('unchanged');
  const [environment, setEnvironment] = useState('unchanged');
  const [tagIds, setTagIds] = useState<string[]>([]);

  if (selectedLinks.length === 0) {
    return null;
  }

  function apply() {
    const patch: BatchLinkPatchDto = {};
    if (projectId !== 'unchanged') {
      patch.projectId = projectId === 'none' ? null : projectId;
    }
    if (categoryId !== 'unchanged') {
      patch.categoryId = categoryId === 'none' ? null : categoryId;
    }
    if (environment !== 'unchanged') {
      patch.environment = environment as LinkResponseDto['environment'];
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
              仅填写需要修改的项目；标签会追加到现有标签中。
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="bulk-project">项目</FieldLabel>
                <Select
                  value={projectId}
                  onValueChange={(value) => setProjectId(value ?? 'unchanged')}
                >
                  <SelectTrigger id="bulk-project" className="w-full">
                    <SelectValue>
                      {(value) =>
                        value === 'unchanged'
                          ? '保持不变'
                          : value === 'none'
                            ? '清空项目'
                            : (taxonomy.projects.find(
                                (item) => item.id === value,
                              )?.name ?? '未知项目')
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unchanged">保持不变</SelectItem>
                    <SelectItem value="none">清空项目</SelectItem>
                    {taxonomy.projects.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
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
            </div>
            <Field>
              <FieldLabel htmlFor="bulk-environment">环境</FieldLabel>
              <Select
                value={environment}
                onValueChange={(value) => setEnvironment(value ?? 'unchanged')}
              >
                <SelectTrigger id="bulk-environment" className="w-full">
                  <SelectValue>
                    {(value) =>
                      value === 'unchanged'
                        ? '保持不变'
                        : environmentLabels[
                            value as LinkResponseDto['environment']
                          ]
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unchanged">保持不变</SelectItem>
                  {Object.entries(environmentLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
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
              应用修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

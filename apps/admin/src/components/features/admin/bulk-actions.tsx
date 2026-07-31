import type {
  AdminTaxonomyState,
  LinkEnvironment,
  ManagedLinkMock,
} from '@/types/admin';
import { environmentLabels } from '@/lib/admin-store';
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
import { TagPicker } from '@/components/tag-picker';

export interface BulkPatch {
  project?: string;
  category?: string;
  environment?: LinkEnvironment;
  tags?: string[];
}

interface BulkActionsProps {
  selectedLinks: ManagedLinkMock[];
  taxonomy: AdminTaxonomyState;
  onClear: () => void;
  onApply: (patch: BulkPatch) => void;
  onComplete: () => void;
}

export function BulkActions({
  selectedLinks,
  taxonomy,
  onClear,
  onApply,
  onComplete,
}: BulkActionsProps) {
  const [open, setOpen] = useState(false);
  const [project, setProject] = useState('unchanged');
  const [category, setCategory] = useState('unchanged');
  const [environment, setEnvironment] = useState('unchanged');
  const [tags, setTags] = useState<string[]>([]);

  if (selectedLinks.length === 0) {
    return null;
  }

  function apply() {
    const patch: BulkPatch = {};
    if (project !== 'unchanged') {
      patch.project = project;
    }
    if (category !== 'unchanged') {
      patch.category = category;
    }
    if (environment !== 'unchanged') {
      patch.environment = environment as LinkEnvironment;
    }
    if (tags.length > 0) {
      patch.tags = tags;
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
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          <ListChecks />
          批量设置
        </Button>
        <Button type="button" onClick={onComplete}>
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
                  value={project}
                  onValueChange={(value) => setProject(String(value))}
                >
                  <SelectTrigger id="bulk-project" className="w-full">
                    <SelectValue>
                      {(value) =>
                        value === 'unchanged' ? '保持不变' : String(value)
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unchanged">保持不变</SelectItem>
                    {taxonomy.projects.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="bulk-category">分类</FieldLabel>
                <Select
                  value={category}
                  onValueChange={(value) => setCategory(String(value))}
                >
                  <SelectTrigger id="bulk-category" className="w-full">
                    <SelectValue>
                      {(value) =>
                        value === 'unchanged' ? '保持不变' : String(value)
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unchanged">保持不变</SelectItem>
                    {taxonomy.categories.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
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
                onValueChange={(value) => setEnvironment(String(value))}
              >
                <SelectTrigger id="bulk-environment" className="w-full">
                  <SelectValue>
                    {(value) =>
                      value === 'unchanged'
                        ? '保持不变'
                        : environmentLabels[
                            value as keyof typeof environmentLabels
                          ]
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unchanged">保持不变</SelectItem>
                  <SelectItem value="production">正式</SelectItem>
                  <SelectItem value="test">测试</SelectItem>
                  <SelectItem value="development">开发</SelectItem>
                  <SelectItem value="unknown">未知</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="bulk-tags">追加标签</FieldLabel>
              <TagPicker
                id="bulk-tags"
                options={taxonomy.tags}
                value={tags}
                onChange={setTags}
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
            <Button type="button" onClick={apply}>
              应用修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

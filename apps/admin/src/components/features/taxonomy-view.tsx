import type { TaxonomyItemResponseDto } from '@/api/types.gen';
import type { TaxonomyCollections, TaxonomyKind } from '@/lib/admin-api';
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { Field, FieldLabel } from '@repo/ui/components/field';
import { Input } from '@repo/ui/components/input';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/ui/components/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@repo/ui/components/tooltip';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface TaxonomyViewProps {
  isPending: boolean;
  kind: TaxonomyKind;
  taxonomy: TaxonomyCollections;
  onKindChange: (kind: TaxonomyKind) => void;
  onAdd: (kind: TaxonomyKind, value: string) => Promise<void>;
  onRename: (kind: TaxonomyKind, id: string, value: string) => Promise<void>;
  onDelete: (kind: TaxonomyKind, id: string) => Promise<void>;
}

const labels: Record<
  TaxonomyKind,
  { singular: string; plural: string; description: string }
> = {
  projects: {
    singular: '项目',
    plural: '项目',
    description: '标记链接所属的产品或工作项目。',
  },
  categories: {
    singular: '分类',
    plural: '分类',
    description: '描述链接资源的基本类型。',
  },
  tags: {
    singular: '标签',
    plural: '标签',
    description: '补充可自由组合的检索维度。',
  },
};

interface TaxonomySectionProps extends Omit<
  TaxonomyViewProps,
  'kind' | 'onKindChange'
> {
  kind: TaxonomyKind;
}

function TaxonomySection({
  isPending,
  kind,
  taxonomy,
  onAdd,
  onRename,
  onDelete,
}: TaxonomySectionProps) {
  const [newValue, setNewValue] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteItem, setDeleteItem] = useState<TaxonomyItemResponseDto | null>(
    null,
  );
  const copy = labels[kind];

  async function addItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await onAdd(kind, newValue);
      setNewValue('');
      toast.success(`已新增${copy.singular}`);
    } catch (error) {
      toast.error(getAdminApiError(error).message);
    }
  }

  function startRename(item: TaxonomyItemResponseDto) {
    setEditingId(item.id);
    setRenameValue(item.name);
  }

  async function saveRename() {
    if (!editingId) {
      return;
    }
    try {
      await onRename(kind, editingId, renameValue);
      setEditingId(null);
      toast.success(`已重命名${copy.singular}并更新现有链接`);
    } catch (error) {
      toast.error(getAdminApiError(error).message);
    }
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{copy.plural}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={addItem} className="flex gap-2">
          <Field>
            <FieldLabel htmlFor={`new-${kind}`} className="sr-only">
              新{copy.singular}名称
            </FieldLabel>
            <Input
              id={`new-${kind}`}
              value={newValue}
              disabled={isPending}
              onChange={(event) => setNewValue(event.target.value)}
              placeholder={`输入新${copy.singular}名称`}
            />
          </Field>
          <Button type="submit" disabled={isPending || !newValue.trim()}>
            <Plus />
            新增
          </Button>
        </form>
        <div className="divide-y rounded-xl border">
          {taxonomy[kind].map((item) => {
            const isEditing = editingId === item.id;
            return (
              <div
                key={item.id}
                className="flex min-h-12 items-center gap-2 px-3 py-2"
              >
                {isEditing ? (
                  <Input
                    value={renameValue}
                    disabled={isPending}
                    onChange={(event) => setRenameValue(event.target.value)}
                    aria-label={`重命名 ${item.name}`}
                    autoFocus
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        void saveRename();
                      }
                      if (event.key === 'Escape') {
                        setEditingId(null);
                      }
                    }}
                  />
                ) : (
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {item.name}
                  </span>
                )}
                <Badge variant="outline">{item.referenceCount} 条引用</Badge>
                {isEditing ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="保存重命名"
                      disabled={isPending}
                      onClick={() => void saveRename()}
                    >
                      <Check />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="取消重命名"
                      disabled={isPending}
                      onClick={() => setEditingId(null)}
                    >
                      <X />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`重命名 ${item.name}`}
                      disabled={isPending}
                      onClick={() => startRename(item)}
                    >
                      <Pencil />
                    </Button>
                    {item.referenceCount > 0 ? (
                      <Tooltip>
                        <TooltipTrigger
                          render={<span className="inline-flex" tabIndex={0} />}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled
                            aria-label={`${item.name} 正在被引用，无法删除`}
                          >
                            <Trash2 />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          仍有 {item.referenceCount} 条链接引用，无法删除
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`删除 ${item.name}`}
                        disabled={isPending}
                        onClick={() => setDeleteItem(item)}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
      <AlertDialog
        open={deleteItem !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteItem(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除“{deleteItem?.name}”？</AlertDialogTitle>
            <AlertDialogDescription>
              这个{copy.singular}没有被任何链接引用。删除后无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                if (deleteItem) {
                  void onDelete(kind, deleteItem.id)
                    .then(() => {
                      toast.success(`已删除${copy.singular}`);
                      setDeleteItem(null);
                    })
                    .catch((error: unknown) => {
                      toast.error(getAdminApiError(error).message);
                    });
                }
              }}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export function TaxonomyView({
  isPending,
  kind,
  taxonomy,
  onKindChange,
  ...actions
}: TaxonomyViewProps) {
  return (
    <section aria-labelledby="taxonomy-heading" className="grid gap-5">
      <div>
        <h2
          id="taxonomy-heading"
          className="text-xl font-semibold tracking-tight sm:text-2xl"
        >
          基础资料
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          管理项目、分类和标签。当前 Tab 保存在 URL。
        </p>
      </div>
      <Tabs
        value={kind}
        onValueChange={(value) => onKindChange(String(value) as TaxonomyKind)}
      >
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="projects">项目</TabsTrigger>
          <TabsTrigger value="categories">分类</TabsTrigger>
          <TabsTrigger value="tags">标签</TabsTrigger>
        </TabsList>
        {(['projects', 'categories', 'tags'] as const).map((value) => (
          <TabsContent key={value} value={value} className="pt-2">
            <TaxonomySection
              {...actions}
              isPending={isPending}
              kind={value}
              taxonomy={taxonomy}
            />
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}

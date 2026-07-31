import type { AdminTaxonomyState, ManagedLinkMock } from '@/types/admin';
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

export type TaxonomyKind = keyof AdminTaxonomyState;

interface TaxonomyViewProps {
  taxonomy: AdminTaxonomyState;
  links: ManagedLinkMock[];
  onAdd: (kind: TaxonomyKind, value: string) => string | null;
  onRename: (
    kind: TaxonomyKind,
    oldValue: string,
    newValue: string,
  ) => string | null;
  onDelete: (kind: TaxonomyKind, value: string) => void;
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

function referenceCount(
  kind: TaxonomyKind,
  value: string,
  links: ManagedLinkMock[],
) {
  if (kind === 'projects') {
    return links.filter((link) => link.project === value).length;
  }
  if (kind === 'categories') {
    return links.filter((link) => link.category === value).length;
  }
  return links.filter((link) => link.tags.includes(value)).length;
}

interface TaxonomySectionProps extends TaxonomyViewProps {
  kind: TaxonomyKind;
}

function TaxonomySection({
  kind,
  taxonomy,
  links,
  onAdd,
  onRename,
  onDelete,
}: TaxonomySectionProps) {
  const [newValue, setNewValue] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteValue, setDeleteValue] = useState<string | null>(null);
  const copy = labels[kind];

  function addItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = onAdd(kind, newValue);
    if (error) {
      toast.error(error);
      return;
    }
    setNewValue('');
    toast.success(`已新增${copy.singular}`);
  }

  function startRename(value: string) {
    setEditing(value);
    setRenameValue(value);
  }

  function saveRename() {
    if (!editing) {
      return;
    }
    const error = onRename(kind, editing, renameValue);
    if (error) {
      toast.error(error);
      return;
    }
    setEditing(null);
    toast.success(`已重命名${copy.singular}并更新现有链接`);
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
              onChange={(event) => setNewValue(event.target.value)}
              placeholder={`输入新${copy.singular}名称`}
            />
          </Field>
          <Button type="submit">
            <Plus />
            新增
          </Button>
        </form>
        <div className="divide-y rounded-xl border">
          {taxonomy[kind].map((value) => {
            const count = referenceCount(kind, value, links);
            const isEditing = editing === value;
            return (
              <div
                key={value}
                className="flex min-h-12 items-center gap-2 px-3 py-2"
              >
                {isEditing ? (
                  <Input
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    aria-label={`重命名 ${value}`}
                    autoFocus
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        saveRename();
                      }
                      if (event.key === 'Escape') {
                        setEditing(null);
                      }
                    }}
                  />
                ) : (
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {value}
                  </span>
                )}
                <Badge variant="outline">{count} 条引用</Badge>
                {isEditing ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="保存重命名"
                      onClick={saveRename}
                    >
                      <Check />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="取消重命名"
                      onClick={() => setEditing(null)}
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
                      aria-label={`重命名 ${value}`}
                      onClick={() => startRename(value)}
                    >
                      <Pencil />
                    </Button>
                    {count > 0 ? (
                      <Tooltip>
                        <TooltipTrigger
                          render={<span className="inline-flex" tabIndex={0} />}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled
                            aria-label={`${value} 正在被引用，无法删除`}
                          >
                            <Trash2 />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          仍有 {count} 条链接引用，无法删除
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`删除 ${value}`}
                        onClick={() => setDeleteValue(value)}
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
        open={deleteValue !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteValue(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除“{deleteValue}”？</AlertDialogTitle>
            <AlertDialogDescription>
              这个{copy.singular}没有被任何链接引用。删除后无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteValue) {
                  onDelete(kind, deleteValue);
                  toast.success(`已删除${copy.singular}`);
                }
                setDeleteValue(null);
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

export function TaxonomyView(props: TaxonomyViewProps) {
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
          管理项目、分类和标签。重命名会同步更新已有链接。
        </p>
      </div>
      <Tabs defaultValue="projects">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="projects">项目</TabsTrigger>
          <TabsTrigger value="categories">分类</TabsTrigger>
          <TabsTrigger value="tags">标签</TabsTrigger>
        </TabsList>
        {(['projects', 'categories', 'tags'] as const).map((kind) => (
          <TabsContent key={kind} value={kind} className="pt-2">
            <TaxonomySection {...props} kind={kind} />
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}

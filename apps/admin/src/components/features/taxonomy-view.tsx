import type { TaxonomyItemResponseDto } from '@/api/types.gen';
import type { TaxonomyCollections, TaxonomyKind } from '@/lib/admin-api';
import { getAdminApiError } from '@/lib/api-error';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
import { Check, GripVertical, Pencil, Plus, Trash2, X } from 'lucide-react';
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
  onReorder: (kind: TaxonomyKind, ids: string[]) => Promise<void>;
}

const labels: Record<
  TaxonomyKind,
  { singular: string; plural: string; description: string }
> = {
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

interface SortableTaxonomyItemProps {
  isEditing: boolean;
  isPending: boolean;
  item: TaxonomyItemResponseDto;
  onCancelRename: () => void;
  onDelete: () => void;
  onRenameChange: (value: string) => void;
  onSaveRename: () => void;
  onStartRename: () => void;
  renameValue: string;
}

function SortableTaxonomyItem({
  isEditing,
  isPending,
  item,
  onCancelRename,
  onDelete,
  onRenameChange,
  onSaveRename,
  onStartRename,
  renameValue,
}: SortableTaxonomyItemProps) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id, disabled: isPending || isEditing });

  return (
    <div
      ref={setNodeRef}
      className={`relative flex min-h-12 items-center gap-2 bg-card px-2 py-2 ${
        isDragging ? 'z-10 opacity-60 shadow-sm' : ''
      }`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="touch-none cursor-grab text-muted-foreground active:cursor-grabbing"
        disabled={isPending || isEditing}
        {...attributes}
        {...listeners}
        aria-label={`拖动排序 ${item.name}`}
      >
        <GripVertical />
      </Button>
      {isEditing ? (
        <Input
          value={renameValue}
          disabled={isPending}
          onChange={(event) => onRenameChange(event.target.value)}
          aria-label={`重命名 ${item.name}`}
          autoFocus
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              onSaveRename();
            }
            if (event.key === 'Escape') {
              onCancelRename();
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
            onClick={onSaveRename}
          >
            <Check />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="取消重命名"
            disabled={isPending}
            onClick={onCancelRename}
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
            onClick={onStartRename}
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
              onClick={onDelete}
            >
              <Trash2 />
            </Button>
          )}
        </>
      )}
    </div>
  );
}

function TaxonomySection({
  isPending,
  kind,
  taxonomy,
  onAdd,
  onRename,
  onDelete,
  onReorder,
}: TaxonomySectionProps) {
  const [newValue, setNewValue] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteItem, setDeleteItem] = useState<TaxonomyItemResponseDto | null>(
    null,
  );
  const copy = labels[kind];
  const items = taxonomy[kind];
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  async function reorderItems(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }
    try {
      await onReorder(
        kind,
        arrayMove(items, oldIndex, newIndex).map((item) => item.id),
      );
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(event) => void reorderItems(event)}
        >
          <SortableContext
            items={items.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="divide-y overflow-hidden rounded-xl border">
              {items.map((item) => (
                <SortableTaxonomyItem
                  key={item.id}
                  isEditing={editingId === item.id}
                  isPending={isPending}
                  item={item}
                  onCancelRename={() => setEditingId(null)}
                  onDelete={() => setDeleteItem(item)}
                  onRenameChange={setRenameValue}
                  onSaveRename={() => void saveRename()}
                  onStartRename={() => startRename(item)}
                  renameValue={renameValue}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
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
          管理分类和标签。当前 Tab 保存在 URL。
        </p>
      </div>
      <Tabs
        value={kind}
        onValueChange={(value) => onKindChange(String(value) as TaxonomyKind)}
      >
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="categories">分类</TabsTrigger>
          <TabsTrigger value="tags">标签</TabsTrigger>
        </TabsList>
        {(['categories', 'tags'] as const).map((value) => (
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

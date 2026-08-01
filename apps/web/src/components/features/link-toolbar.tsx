import type { WebOverviewResponseDto } from '@/api/types.gen';
import type { WebLinksSearch } from '@/lib/web-search';
import { environmentLabels, statusLabels } from '@/lib/link-display';
import { Button } from '@repo/ui/components/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@repo/ui/components/input-group';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@repo/ui/components/sheet';
import { RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';

type SearchUpdater = (previous: WebLinksSearch) => WebLinksSearch;

interface LinkToolbarProps {
  search: WebLinksSearch;
  overview: WebOverviewResponseDto;
  resultCount: number;
  onSearchChange: (
    updater: SearchUpdater,
    options?: { replace?: boolean },
  ) => void;
  onReset: () => void;
}

interface FilterFieldsProps {
  search: WebLinksSearch;
  overview: WebOverviewResponseDto;
  onSearchChange: (updater: SearchUpdater) => void;
  stacked?: boolean;
}

function FilterFields({
  search,
  overview,
  onSearchChange,
  stacked = false,
}: FilterFieldsProps) {
  const projectItems = [
    { label: '全部项目', value: 'all' },
    ...overview.projects.map((project) => ({
      label: project.name,
      value: project.id,
    })),
    { label: '未分配项目', value: 'unassigned' },
  ];
  const categoryItems = [
    { label: '全部分类', value: 'all' },
    ...overview.categories.map((category) => ({
      label: category.name,
      value: category.id,
    })),
  ];
  const environmentItems = [
    { label: '全部环境', value: 'all' },
    ...Object.entries(environmentLabels).map(([value, label]) => ({
      label,
      value,
    })),
  ];
  const statusItems = [
    { label: '全部状态', value: 'all' },
    ...Object.entries(statusLabels).map(([value, label]) => ({ label, value })),
  ];
  const sortItems = [
    { label: '最近添加', value: 'newest' },
    { label: '最早添加', value: 'oldest' },
    { label: '标题排序', value: 'title' },
  ];
  const fieldClassName = stacked ? 'grid gap-2' : 'contents';
  const triggerClassName = stacked ? 'w-full' : 'min-w-28';

  function updateFilter<Key extends keyof WebLinksSearch>(
    key: Key,
    value: WebLinksSearch[Key],
  ) {
    onSearchChange((previous) => ({
      ...previous,
      [key]: value,
      linkId: undefined,
      page: 1,
    }));
  }

  return (
    <div
      className={
        stacked
          ? 'grid grid-cols-1 gap-4 sm:grid-cols-2'
          : 'flex flex-wrap items-center gap-2'
      }
    >
      <label className={fieldClassName}>
        {stacked ? (
          <span className="text-xs font-medium text-muted-foreground">
            项目
          </span>
        ) : null}
        <Select
          items={projectItems}
          value={search.projectId ?? 'all'}
          onValueChange={(value) =>
            updateFilter(
              'projectId',
              value && value !== 'all' ? value : undefined,
            )
          }
        >
          <SelectTrigger aria-label="按项目筛选" className={triggerClassName}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectGroup>
              {projectItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </label>

      <label className={fieldClassName}>
        {stacked ? (
          <span className="text-xs font-medium text-muted-foreground">
            分类
          </span>
        ) : null}
        <Select
          items={categoryItems}
          value={search.categoryId ?? 'all'}
          onValueChange={(value) =>
            updateFilter(
              'categoryId',
              value && value !== 'all' ? value : undefined,
            )
          }
        >
          <SelectTrigger aria-label="按分类筛选" className={triggerClassName}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectGroup>
              {categoryItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </label>

      <label className={fieldClassName}>
        {stacked ? (
          <span className="text-xs font-medium text-muted-foreground">
            环境
          </span>
        ) : null}
        <Select
          items={environmentItems}
          value={search.environment ?? 'all'}
          onValueChange={(value) =>
            updateFilter(
              'environment',
              value && value !== 'all'
                ? (value as WebLinksSearch['environment'])
                : undefined,
            )
          }
        >
          <SelectTrigger aria-label="按环境筛选" className={triggerClassName}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectGroup>
              {environmentItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </label>

      <label className={fieldClassName}>
        {stacked ? (
          <span className="text-xs font-medium text-muted-foreground">
            整理状态
          </span>
        ) : null}
        <Select
          items={statusItems}
          value={search.status ?? 'all'}
          onValueChange={(value) =>
            updateFilter(
              'status',
              value && value !== 'all'
                ? (value as WebLinksSearch['status'])
                : undefined,
            )
          }
        >
          <SelectTrigger
            aria-label="按整理状态筛选"
            className={triggerClassName}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectGroup>
              {statusItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </label>

      <label className={fieldClassName}>
        {stacked ? (
          <span className="text-xs font-medium text-muted-foreground">
            排序
          </span>
        ) : null}
        <Select
          items={sortItems}
          value={search.sort}
          onValueChange={(value) =>
            updateFilter('sort', (value ?? 'newest') as WebLinksSearch['sort'])
          }
        >
          <SelectTrigger aria-label="选择排序方式" className={triggerClassName}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectGroup>
              {sortItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </label>
    </div>
  );
}

export function LinkToolbar({
  search,
  overview,
  resultCount,
  onSearchChange,
  onReset,
}: LinkToolbarProps) {
  const activeFilterCount = [
    search.view !== 'all',
    search.projectId,
    search.categoryId,
    search.environment,
    search.status,
    search.sort !== 'newest',
  ].filter(Boolean).length;

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        <InputGroup className="h-9 flex-1">
          <InputGroupAddon>
            <Search aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="搜索链接"
            placeholder="搜索标题、URL、项目、用途、标签或来源"
            value={search.q ?? ''}
            onChange={(event) => {
              const value = event.target.value;
              onSearchChange(
                (previous) => ({
                  ...previous,
                  linkId: undefined,
                  page: 1,
                  q: value || undefined,
                }),
                { replace: true },
              );
            }}
          />
          {search.q ? (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                aria-label="清空搜索"
                onClick={() =>
                  onSearchChange(
                    (previous) => ({ ...previous, page: 1, q: undefined }),
                    { replace: true },
                  )
                }
              >
                <X />
              </InputGroupButton>
            </InputGroupAddon>
          ) : null}
        </InputGroup>

        <Sheet>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                size="icon-lg"
                className="md:hidden"
                aria-label="打开筛选"
              />
            }
          >
            <SlidersHorizontal />
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md!">
            <SheetHeader>
              <SheetTitle>筛选链接</SheetTitle>
              <SheetDescription>
                按项目、分类、环境和整理状态缩小查找范围。
              </SheetDescription>
            </SheetHeader>
            <div className="px-4">
              <FilterFields
                search={search}
                overview={overview}
                onSearchChange={onSearchChange}
                stacked
              />
            </div>
            <SheetFooter>
              <Button variant="outline" onClick={onReset}>
                <RotateCcw data-icon="inline-start" />
                重置筛选
              </Button>
              <SheetClose render={<Button />}>
                显示 {resultCount} 条链接
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      <div className="hidden items-center justify-between gap-3 md:flex">
        <FilterFields
          search={search}
          overview={overview}
          onSearchChange={onSearchChange}
        />
        {activeFilterCount > 0 || search.q ? (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={onReset}
          >
            <RotateCcw data-icon="inline-start" />
            重置
          </Button>
        ) : null}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground md:hidden">
        <span>
          {activeFilterCount > 0
            ? `已启用 ${activeFilterCount} 个筛选条件`
            : '全部项目与分类'}
        </span>
        {activeFilterCount > 0 || search.q ? (
          <Button variant="ghost" size="xs" onClick={onReset}>
            重置
          </Button>
        ) : null}
      </div>
    </div>
  );
}

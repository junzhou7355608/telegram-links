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
import type { LinkView } from '@/components/features/app-sidebar';
import {
  categoryLabels,
  environmentLabels,
  linkCategories,
  statusLabels,
  type LinkCategory,
  type LinkEnvironment,
  type OrganizationStatus,
} from '@/data/links';

export type LinkSort = 'newest' | 'oldest' | 'title';

export interface LinkFilters {
  query: string;
  view: LinkView;
  project: string;
  category: LinkCategory | 'all';
  environment: LinkEnvironment | 'all';
  status: OrganizationStatus | 'all';
  sort: LinkSort;
}

interface LinkToolbarProps {
  filters: LinkFilters;
  projects: readonly string[];
  resultCount: number;
  onFiltersChange: (filters: LinkFilters) => void;
  onReset: () => void;
}

interface FilterFieldsProps {
  filters: LinkFilters;
  projects: readonly string[];
  onFiltersChange: (filters: LinkFilters) => void;
  stacked?: boolean;
}

function FilterFields({
  filters,
  projects,
  onFiltersChange,
  stacked = false,
}: FilterFieldsProps) {
  const projectItems = [
    { label: '全部项目', value: 'all' },
    ...projects.map((project) => ({ label: project, value: project })),
    { label: '未分配项目', value: 'unassigned' },
  ];
  const categoryItems = [
    { label: '全部分类', value: 'all' },
    ...linkCategories.map((category) => ({
      label: categoryLabels[category],
      value: category,
    })),
  ];
  const environmentItems = [
    { label: '全部环境', value: 'all' },
    ...(Object.keys(environmentLabels) as readonly LinkEnvironment[]).map(
      (environment) => ({
        label: environmentLabels[environment],
        value: environment,
      }),
    ),
  ];
  const statusItems = [
    { label: '全部状态', value: 'all' },
    ...(Object.keys(statusLabels) as readonly OrganizationStatus[]).map(
      (status) => ({
        label: statusLabels[status],
        value: status,
      }),
    ),
  ];
  const sortItems = [
    { label: '最近添加', value: 'newest' },
    { label: '最早添加', value: 'oldest' },
    { label: '标题排序', value: 'title' },
  ];

  function updateFilter<Key extends keyof LinkFilters>(
    key: Key,
    value: LinkFilters[Key],
  ) {
    onFiltersChange({ ...filters, [key]: value });
  }

  const fieldClassName = stacked ? 'grid gap-2' : 'contents';
  const triggerClassName = stacked ? 'w-full' : 'min-w-28';

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
          value={filters.project}
          onValueChange={(value) => updateFilter('project', value ?? 'all')}
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
          value={filters.category}
          onValueChange={(value) =>
            updateFilter('category', (value ?? 'all') as LinkCategory | 'all')
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
          value={filters.environment}
          onValueChange={(value) =>
            updateFilter(
              'environment',
              (value ?? 'all') as LinkEnvironment | 'all',
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
          value={filters.status}
          onValueChange={(value) =>
            updateFilter(
              'status',
              (value ?? 'all') as OrganizationStatus | 'all',
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
          value={filters.sort}
          onValueChange={(value) =>
            updateFilter('sort', (value ?? 'newest') as LinkSort)
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
  filters,
  projects,
  resultCount,
  onFiltersChange,
  onReset,
}: LinkToolbarProps) {
  const activeFilterCount = [
    filters.view !== 'all',
    filters.project !== 'all',
    filters.category !== 'all',
    filters.environment !== 'all',
    filters.status !== 'all',
    filters.sort !== 'newest',
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
            placeholder="搜索标题、URL、项目、用途或标签"
            value={filters.query}
            onChange={(event) =>
              onFiltersChange({ ...filters, query: event.target.value })
            }
          />
          {filters.query ? (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                aria-label="清空搜索"
                onClick={() => onFiltersChange({ ...filters, query: '' })}
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
                按项目、用途和整理状态缩小查找范围。
              </SheetDescription>
            </SheetHeader>
            <div className="px-4">
              <FilterFields
                filters={filters}
                projects={projects}
                onFiltersChange={onFiltersChange}
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
          filters={filters}
          projects={projects}
          onFiltersChange={onFiltersChange}
        />
        {activeFilterCount > 0 || filters.query ? (
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
        {activeFilterCount > 0 || filters.query ? (
          <Button variant="ghost" size="xs" onClick={onReset}>
            重置
          </Button>
        ) : null}
      </div>
    </div>
  );
}

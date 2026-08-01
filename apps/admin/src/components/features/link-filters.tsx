import { SourceChatPicker } from '@/components/features/source-chat-picker';
import { TagPicker } from '@/components/features/tag-picker';
import type { LinksSearch } from '@/lib/admin-search';
import { statusLabels } from '@/lib/admin-display';
import type { TaxonomyCollections } from '@/lib/admin-api';
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
import { Archive, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterSelectProps {
  label: string;
  value?: string;
  options: FilterOption[];
  stacked?: boolean;
  onChange: (value: string | undefined) => void;
}

function FilterSelect({
  label,
  value,
  options,
  stacked = false,
  onChange,
}: FilterSelectProps) {
  const displayValue =
    options.find((option) => option.value === value)?.label ?? `全部${label}`;
  return (
    <label className={stacked ? 'grid gap-2' : 'contents'}>
      {stacked ? (
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
      ) : null}
      <Select
        value={value ?? 'all'}
        onValueChange={(next) =>
          onChange(String(next) === 'all' ? undefined : String(next))
        }
      >
        <SelectTrigger
          className={stacked ? 'w-full' : 'min-w-28'}
          aria-label={`按${label}筛选`}
        >
          <SelectValue>{displayValue}</SelectValue>
        </SelectTrigger>
        <SelectContent align="start">
          <SelectItem value="all">全部{label}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

interface FilterFieldsProps {
  filters: LinksSearch;
  showStatus: boolean;
  stacked?: boolean;
  taxonomy: TaxonomyCollections;
  onChange: (filters: LinksSearch) => void;
}

function FilterFields({
  filters,
  showStatus,
  stacked = false,
  taxonomy,
  onChange,
}: FilterFieldsProps) {
  function update<Key extends keyof LinksSearch>(
    key: Key,
    value: LinksSearch[Key],
  ) {
    onChange({ ...filters, [key]: value, page: 1 });
  }

  return (
    <div
      className={
        stacked
          ? 'grid grid-cols-1 gap-4 sm:grid-cols-2'
          : 'flex flex-wrap items-center gap-2'
      }
    >
      <FilterSelect
        label="分类"
        value={filters.categoryId}
        options={taxonomy.categories.map((item) => ({
          label: item.name,
          value: item.id,
        }))}
        stacked={stacked}
        onChange={(value) => update('categoryId', value)}
      />
      <label className={stacked ? 'grid gap-2' : 'contents'}>
        {stacked ? (
          <span className="text-xs font-medium text-muted-foreground">
            来源
          </span>
        ) : null}
        <SourceChatPicker
          value={filters.sourceChatId}
          onChange={(value) => update('sourceChatId', value)}
        />
      </label>
      {showStatus ? (
        <FilterSelect
          label="状态"
          value={filters.status}
          options={Object.entries(statusLabels).map(([value, label]) => ({
            label,
            value,
          }))}
          stacked={stacked}
          onChange={(value) =>
            update('status', value as LinksSearch['status'] | undefined)
          }
        />
      ) : null}
      <FilterSelect
        label="排序"
        value={filters.sort}
        options={[
          { label: '最近添加', value: 'newest' },
          { label: '最早添加', value: 'oldest' },
          { label: '标题', value: 'title' },
        ]}
        stacked={stacked}
        onChange={(value) =>
          update('sort', (value ?? 'newest') as LinksSearch['sort'])
        }
      />
      <label className={stacked ? 'grid gap-2 sm:col-span-2' : 'contents'}>
        {stacked ? (
          <span className="text-xs font-medium text-muted-foreground">
            标签
          </span>
        ) : null}
        <div className={stacked ? undefined : 'min-w-36'}>
          <TagPicker
            options={taxonomy.tags}
            value={filters.tagIds ?? []}
            onChange={(value) =>
              update('tagIds', value.length ? value : undefined)
            }
            placeholder="全部标签"
          />
        </div>
      </label>
      <Button
        type="button"
        variant={filters.includeArchived ? 'secondary' : 'outline'}
        onClick={() => update('includeArchived', !filters.includeArchived)}
      >
        <Archive />
        包含归档
      </Button>
    </div>
  );
}

interface LinkFiltersProps {
  filters: LinksSearch;
  searchValue: string;
  taxonomy: TaxonomyCollections;
  showStatus: boolean;
  resultCount: number;
  onChange: (filters: LinksSearch) => void;
  onReset: () => void;
  onSearchValueChange: (value: string) => void;
}

export function LinkFiltersBar({
  filters,
  searchValue,
  taxonomy,
  showStatus,
  resultCount,
  onChange,
  onReset,
  onSearchValueChange,
}: LinkFiltersProps) {
  const activeFilterCount = [
    filters.categoryId,
    filters.sourceChatId,
    showStatus && filters.status,
    filters.sort !== 'newest',
    filters.tagIds?.length,
    filters.includeArchived,
  ].filter(Boolean).length;

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        <InputGroup className="h-9 flex-1">
          <InputGroupAddon>
            <Search aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            value={searchValue}
            onChange={(event) => onSearchValueChange(event.target.value)}
            placeholder="搜索标题、URL、用途、分类、标签或来源"
            aria-label="搜索链接"
          />
          {searchValue ? (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                aria-label="清空搜索"
                onClick={() => onSearchValueChange('')}
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
                type="button"
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
                筛选条件保存在 URL，刷新和前进后退都可恢复。
              </SheetDescription>
            </SheetHeader>
            <div className="px-4">
              <FilterFields
                filters={filters}
                showStatus={showStatus}
                stacked
                taxonomy={taxonomy}
                onChange={onChange}
              />
            </div>
            <SheetFooter>
              <Button type="button" variant="outline" onClick={onReset}>
                <RotateCcw />
                重置筛选
              </Button>
              <SheetClose render={<Button type="button" />}>
                显示 {resultCount} 条链接
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      <div className="hidden items-center justify-between gap-3 md:flex">
        <FilterFields
          filters={filters}
          showStatus={showStatus}
          taxonomy={taxonomy}
          onChange={onChange}
        />
        {activeFilterCount > 0 || filters.q ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={onReset}
          >
            <RotateCcw />
            重置
          </Button>
        ) : null}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground md:hidden">
        <span>
          {activeFilterCount > 0
            ? `已启用 ${activeFilterCount} 个筛选条件`
            : '未启用附加筛选'}
        </span>
        {activeFilterCount > 0 || filters.q ? (
          <Button type="button" variant="ghost" size="xs" onClick={onReset}>
            重置
          </Button>
        ) : null}
      </div>
    </div>
  );
}

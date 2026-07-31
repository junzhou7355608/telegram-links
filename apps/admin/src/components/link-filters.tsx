import type {
  AdminTaxonomyState,
  LinkFilters,
  ManagedLinkMock,
} from '@/types/admin';
import { environmentLabels, statusLabels } from '@/lib/admin-store';
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
import { RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { useMemo } from 'react';

interface LinkFiltersProps {
  filters: LinkFilters;
  links: ManagedLinkMock[];
  taxonomy: AdminTaxonomyState;
  showStatus: boolean;
  resultCount: number;
  onChange: (filters: LinkFilters) => void;
  onReset: () => void;
}

interface FilterSelectProps {
  label: string;
  value: string;
  options: string[];
  stacked?: boolean;
  onChange: (value: string) => void;
}

function FilterSelect({
  label,
  value,
  options,
  stacked = false,
  onChange,
}: FilterSelectProps) {
  function formatValue(selected: unknown) {
    const selectedValue = String(selected);
    if (selectedValue === 'all') {
      return `全部${label}`;
    }
    if (label === '环境' && selectedValue in environmentLabels) {
      return environmentLabels[selectedValue as keyof typeof environmentLabels];
    }
    if (label === '状态' && selectedValue in statusLabels) {
      return statusLabels[selectedValue as keyof typeof statusLabels];
    }
    return selectedValue;
  }

  return (
    <label className={stacked ? 'grid gap-2' : 'contents'}>
      {stacked ? (
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
      ) : null}
      <Select value={value} onValueChange={(next) => onChange(String(next))}>
        <SelectTrigger
          className={stacked ? 'w-full' : 'min-w-28'}
          aria-label={`按${label}筛选`}
        >
          <SelectValue>{formatValue}</SelectValue>
        </SelectTrigger>
        <SelectContent align="start">
          <SelectItem value="all">全部{label}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {formatValue(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

interface FilterFieldsProps {
  filters: LinkFilters;
  chats: string[];
  taxonomy: AdminTaxonomyState;
  showStatus: boolean;
  stacked?: boolean;
  onChange: (filters: LinkFilters) => void;
}

function FilterFields({
  filters,
  chats,
  taxonomy,
  showStatus,
  stacked = false,
  onChange,
}: FilterFieldsProps) {
  function update<Key extends keyof LinkFilters>(
    key: Key,
    value: LinkFilters[Key],
  ) {
    onChange({ ...filters, [key]: value });
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
        label="项目"
        value={filters.project}
        options={taxonomy.projects}
        stacked={stacked}
        onChange={(value) => update('project', value)}
      />
      <FilterSelect
        label="分类"
        value={filters.category}
        options={taxonomy.categories}
        stacked={stacked}
        onChange={(value) => update('category', value)}
      />
      <FilterSelect
        label="环境"
        value={filters.environment}
        options={['production', 'test', 'development', 'unknown']}
        stacked={stacked}
        onChange={(value) => update('environment', value)}
      />
      <FilterSelect
        label="来源"
        value={filters.sourceChat}
        options={chats}
        stacked={stacked}
        onChange={(value) => update('sourceChat', value)}
      />
      {showStatus ? (
        <FilterSelect
          label="状态"
          value={filters.status}
          options={['pending', 'organized']}
          stacked={stacked}
          onChange={(value) => update('status', value)}
        />
      ) : null}
    </div>
  );
}

export function LinkFiltersBar({
  filters,
  links,
  taxonomy,
  showStatus,
  resultCount,
  onChange,
  onReset,
}: LinkFiltersProps) {
  const chats = useMemo(
    () =>
      [...new Set(links.map((link) => link.source.chatName))].toSorted((a, b) =>
        a.localeCompare(b, 'zh-CN'),
      ),
    [links],
  );
  const activeFilterCount = [
    filters.project !== 'all',
    filters.category !== 'all',
    filters.environment !== 'all',
    filters.sourceChat !== 'all',
    showStatus && filters.status !== 'all',
  ].filter(Boolean).length;

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        <InputGroup className="h-9 flex-1">
          <InputGroupAddon>
            <Search aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            value={filters.query}
            onChange={(event) =>
              onChange({ ...filters, query: event.target.value })
            }
            placeholder="搜索标题、URL、项目、用途或标签"
            aria-label="搜索链接"
          />
          {filters.query ? (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                aria-label="清空搜索"
                onClick={() => onChange({ ...filters, query: '' })}
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
                按项目、分类、环境、来源和整理状态缩小范围。
              </SheetDescription>
            </SheetHeader>
            <div className="px-4">
              <FilterFields
                filters={filters}
                chats={chats}
                taxonomy={taxonomy}
                showStatus={showStatus}
                stacked
                onChange={onChange}
              />
            </div>
            <SheetFooter>
              <Button type="button" variant="outline" onClick={onReset}>
                <RotateCcw data-icon="inline-start" />
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
          chats={chats}
          taxonomy={taxonomy}
          showStatus={showStatus}
          onChange={onChange}
        />
        {activeFilterCount > 0 || filters.query ? (
          <Button
            type="button"
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
          <Button type="button" variant="ghost" size="xs" onClick={onReset}>
            重置
          </Button>
        ) : null}
      </div>
    </div>
  );
}

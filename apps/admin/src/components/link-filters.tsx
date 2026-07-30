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
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@repo/ui/components/sheet';
import { ListFilter, RotateCcw, Search } from 'lucide-react';
import { useState } from 'react';

interface LinkFiltersProps {
  filters: LinkFilters;
  links: ManagedLinkMock[];
  taxonomy: AdminTaxonomyState;
  showStatus: boolean;
  onChange: (filters: LinkFilters) => void;
  onReset: () => void;
}

interface FilterSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

function FilterSelect({ label, value, options, onChange }: FilterSelectProps) {
  function formatValue(selected: unknown) {
    const selectedValue = String(selected);
    if (selectedValue === 'all') {
      return `全部${label}`;
    }
    if (label === '环境' && selectedValue in environmentLabels) {
      return environmentLabels[
        selectedValue as keyof typeof environmentLabels
      ];
    }
    if (label === '状态' && selectedValue in statusLabels) {
      return statusLabels[selectedValue as keyof typeof statusLabels];
    }
    return selectedValue;
  }

  return (
    <Select value={value} onValueChange={(next) => onChange(String(next))}>
      <SelectTrigger className="w-full md:w-36" aria-label={label}>
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
  );
}

export function LinkFiltersBar({
  filters,
  links,
  taxonomy,
  showStatus,
  onChange,
  onReset,
}: LinkFiltersProps) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const chats = [...new Set(links.map((link) => link.source.chatName))].sort();

  function update<Key extends keyof LinkFilters>(
    key: Key,
    value: LinkFilters[Key],
  ) {
    onChange({ ...filters, [key]: value });
  }

  const filterControls = (
    <>
      <FilterSelect
        label="项目"
        value={filters.project}
        options={taxonomy.projects}
        onChange={(value) => update('project', value)}
      />
      <FilterSelect
        label="分类"
        value={filters.category}
        options={taxonomy.categories}
        onChange={(value) => update('category', value)}
      />
      <FilterSelect
        label="环境"
        value={filters.environment}
        options={['production', 'test', 'development', 'unknown']}
        onChange={(value) => update('environment', value)}
      />
      <FilterSelect
        label="来源"
        value={filters.sourceChat}
        options={chats}
        onChange={(value) => update('sourceChat', value)}
      />
      {showStatus ? (
        <FilterSelect
          label="状态"
          value={filters.status}
          options={['pending', 'organized']}
          onChange={(value) => update('status', value)}
        />
      ) : null}
    </>
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <InputGroup className="max-w-xl flex-1">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            value={filters.query}
            onChange={(event) => update('query', event.target.value)}
            placeholder="搜索标题、URL、项目、用途或标签…"
            aria-label="搜索链接"
          />
        </InputGroup>
        <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
          <SheetTrigger
            render={
              <Button
                type="button"
                variant="outline"
                className="md:hidden"
                aria-label="打开筛选"
              />
            }
          >
            <ListFilter />
            筛选
          </SheetTrigger>
          <SheetContent side="right" className="w-full max-w-sm">
            <SheetHeader>
              <SheetTitle>筛选链接</SheetTitle>
              <SheetDescription>
                组合条件只作用于本地演示数据。
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-3 px-4">{filterControls}</div>
            <div className="mt-auto grid gap-2 border-t p-4">
              <Button type="button" onClick={() => setMobileFiltersOpen(false)}>
                查看结果
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onReset();
                  setMobileFiltersOpen(false);
                }}
              >
                <RotateCcw />
                重置条件
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <div className="hidden flex-wrap gap-2 md:flex">
        {filterControls}
        <Button type="button" variant="ghost" onClick={onReset}>
          <RotateCcw />
          重置
        </Button>
      </div>
    </div>
  );
}

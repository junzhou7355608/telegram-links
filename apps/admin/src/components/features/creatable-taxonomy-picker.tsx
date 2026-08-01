import type { TaxonomyItemResponseDto } from '@/api/types.gen';
import type { TaxonomyKind } from '@/lib/admin-api';
import { getAdminApiError } from '@/lib/api-error';
import { Button } from '@repo/ui/components/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@repo/ui/components/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@repo/ui/components/popover';
import {
  Check,
  ChevronsUpDown,
  LoaderCircle,
  Plus,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

interface CreatableTaxonomyPickerProps {
  disabled?: boolean;
  id?: string;
  kind: TaxonomyKind;
  multiple?: boolean;
  onChange: (value: string[]) => void;
  onCreate: (
    kind: TaxonomyKind,
    name: string,
  ) => Promise<TaxonomyItemResponseDto>;
  options: TaxonomyItemResponseDto[];
  placeholder?: string;
  value: string[];
}

const labels: Record<TaxonomyKind, string> = {
  categories: '分类',
  tags: '标签',
};

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase('zh-CN');
}

export function CreatableTaxonomyPicker({
  disabled = false,
  id,
  kind,
  multiple = false,
  onChange,
  onCreate,
  options,
  placeholder,
  value,
}: CreatableTaxonomyPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const label = labels[kind];
  const normalizedSearch = normalizeName(search);
  const nameToCreate = search.trim();
  const selectedNames = options
    .filter((option) => value.includes(option.id))
    .map((option) => option.name);
  const exactOption = options.find(
    (option) => normalizeName(option.name) === normalizedSearch,
  );
  const visibleOptions = useMemo(() => {
    if (!normalizedSearch) {
      return options;
    }
    const matches = options.filter((option) =>
      normalizeName(option.name).includes(normalizedSearch),
    );
    if (!exactOption) {
      return matches;
    }
    return [
      exactOption,
      ...matches.filter((option) => option.id !== exactOption.id),
    ];
  }, [exactOption, normalizedSearch, options]);
  const canCreate = Boolean(nameToCreate) && !exactOption;

  function selectOption(optionId: string) {
    onChange(
      multiple
        ? value.includes(optionId)
          ? value.filter((item) => item !== optionId)
          : [...value, optionId]
        : [optionId],
    );
    setSearch('');
    setCreateError('');
    if (!multiple) {
      setOpen(false);
    }
  }

  async function createOption() {
    if (!canCreate || isCreating) {
      return;
    }
    setIsCreating(true);
    setCreateError('');
    try {
      const created = await onCreate(kind, nameToCreate);
      onChange(
        multiple
          ? [...value.filter((item) => item !== created.id), created.id]
          : [created.id],
      );
      setSearch('');
      toast.success(`已新增并选择${label}`);
      if (!multiple) {
        setOpen(false);
      }
    } catch (error) {
      setCreateError(getAdminApiError(error).message);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setSearch('');
          setCreateError('');
        }
      }}
    >
      <PopoverTrigger
        id={id}
        disabled={disabled}
        render={
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-auto min-h-8 w-full justify-between font-normal"
          />
        }
      >
        <span className="min-w-0 truncate">
          {selectedNames.length > 0
            ? selectedNames.join('、')
            : (placeholder ?? `选择或新增${label}`)}
        </span>
        <ChevronsUpDown className="shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--anchor-width) p-0">
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={(nextSearch) => {
              setSearch(nextSearch);
              setCreateError('');
            }}
            maxLength={100}
            disabled={disabled || isCreating}
            placeholder={`输入或搜索${label}…`}
          />
          <CommandList>
            <CommandGroup>
              {!multiple && !normalizedSearch ? (
                <CommandItem
                  value="taxonomy-none"
                  disabled={disabled || isCreating}
                  onSelect={() => {
                    onChange([]);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={
                      value.length === 0 ? 'opacity-100' : 'opacity-0'
                    }
                  />
                  未设置
                </CommandItem>
              ) : null}
              {canCreate ? (
                <CommandItem
                  value={`create-${nameToCreate}`}
                  disabled={disabled || isCreating}
                  onSelect={() => void createOption()}
                >
                  {isCreating ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <Plus />
                  )}
                  <span className="min-w-0 flex-1 truncate">
                    新增“{nameToCreate}”
                  </span>
                  <CommandShortcut>回车</CommandShortcut>
                </CommandItem>
              ) : null}
              {visibleOptions.map((option) => {
                const selected = value.includes(option.id);
                return (
                  <CommandItem
                    key={option.id}
                    value={option.name}
                    disabled={disabled || isCreating}
                    onSelect={() => selectOption(option.id)}
                  >
                    <Check
                      className={selected ? 'opacity-100' : 'opacity-0'}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {option.name}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {!canCreate && visibleOptions.length === 0 ? (
              <CommandEmpty>输入名称后按回车新增</CommandEmpty>
            ) : null}
          </CommandList>
          {createError ? (
            <p className="border-t px-3 py-2 text-xs text-destructive">
              {createError}
            </p>
          ) : null}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

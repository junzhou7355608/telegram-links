import { Button } from '@repo/ui/components/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@repo/ui/components/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@repo/ui/components/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';

interface TagPickerProps {
  id?: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

export function TagPicker({
  id,
  options,
  value,
  onChange,
  placeholder = '选择标签',
}: TagPickerProps) {
  const [open, setOpen] = useState(false);

  function toggleTag(tag: string) {
    onChange(
      value.includes(tag)
        ? value.filter((item) => item !== tag)
        : [...value, tag],
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        render={
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-8 w-full justify-between font-normal"
          />
        }
      >
        <span className="min-w-0 truncate">
          {value.length > 0 ? value.join('、') : placeholder}
        </span>
        <ChevronsUpDown className="shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--anchor-width) p-0">
        <Command>
          <CommandInput placeholder="搜索标签…" />
          <CommandList>
            <CommandEmpty>没有匹配的标签</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const selected = value.includes(option);
                return (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => toggleTag(option)}
                  >
                    <Check className={selected ? 'opacity-100' : 'opacity-0'} />
                    {option}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

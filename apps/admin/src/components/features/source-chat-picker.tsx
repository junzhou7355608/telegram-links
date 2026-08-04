import { adminTelegramControllerListChatsOptions } from '@/api/@tanstack/react-query.gen';
import { useApiErrorToast } from '@/hooks/use-api-error-toast';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
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
import { cn } from '@repo/ui/lib/utils';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Check, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';

interface SourceChatPickerProps {
  className?: string;
  value?: string;
  onChange: (value: string | undefined) => void;
}

export function SourceChatPicker({
  className,
  value,
  onChange,
}: SourceChatPickerProps) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const chats = useQuery({
    ...adminTelegramControllerListChatsOptions({
      query: {
        page,
        pageSize: 20,
        query: debouncedSearch.trim() || undefined,
      },
    }),
    enabled: open,
    placeholderData: keepPreviousData,
  });
  useApiErrorToast(chats.error);
  const selected = chats.data?.items.find((chat) => chat.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn(
              'justify-between font-normal',
              className ?? 'min-w-28',
            )}
          />
        }
      >
        <span className="max-w-32 truncate">
          {selected?.title ?? (value ? '已选择来源' : '全部来源')}
        </span>
        <ChevronsUpDown className="shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={(next) => {
              setSearch(next);
              setPage(1);
            }}
            placeholder="搜索聊天名称或用户名…"
          />
          <CommandList>
            <CommandGroup>
              <CommandItem
                value="all"
                onSelect={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
              >
                <Check className={value ? 'opacity-0' : 'opacity-100'} />
                全部来源
              </CommandItem>
              {chats.data?.items.map((chat) => (
                <CommandItem
                  key={chat.id}
                  value={chat.id}
                  onSelect={() => {
                    onChange(chat.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={value === chat.id ? 'opacity-100' : 'opacity-0'}
                  />
                  <span className="min-w-0 truncate">{chat.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            {!chats.isPending && chats.data?.items.length === 0 ? (
              <CommandEmpty>没有匹配的聊天</CommandEmpty>
            ) : null}
          </CommandList>
          {chats.data && chats.data.pagination.totalPages > 1 ? (
            <div className="flex items-center justify-between border-t p-1">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
                aria-label="上一页聊天"
              >
                <ChevronLeft />
              </Button>
              <span className="text-xs text-muted-foreground">
                {page} / {chats.data.pagination.totalPages}
              </span>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                disabled={page >= chats.data.pagination.totalPages}
                onClick={() => setPage((current) => current + 1)}
                aria-label="下一页聊天"
              >
                <ChevronRight />
              </Button>
            </div>
          ) : null}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

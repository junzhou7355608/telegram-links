import { adminTelegramControllerScanOptionsOptions } from '@/api/@tanstack/react-query.gen';
import type {
  CreateSyncJobDto,
  TelegramChatScanOptionResponseDto,
} from '@/api/types.gen';
import { TagPicker } from '@/components/features/tag-picker';
import { useApiErrorToast } from '@/hooks/use-api-error-toast';
import { useTaxonomy } from '@/hooks/use-taxonomy';
import { getAdminApiError } from '@/lib/api-error';
import {
  filterScanChats,
  resolveScanChatIds,
  toggleScanChat,
} from '@/lib/scan-chat-selection';
import { Alert, AlertDescription, AlertTitle } from '@repo/ui/components/alert';
import { Button } from '@repo/ui/components/button';
import { Checkbox } from '@repo/ui/components/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/dialog';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@repo/ui/components/field';
import { Input } from '@repo/ui/components/input';
import { ScrollArea } from '@repo/ui/components/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, LoaderCircle, Search } from 'lucide-react';
import { useState } from 'react';

interface ScanConfiguration {
  defaultCategoryId?: string;
  defaultProjectId?: string;
  defaultTagIds: string[];
  rangeFrom?: string;
  rangeMode: CreateSyncJobDto['rangeMode'];
  rangeTo?: string;
}

interface ScanDialogProps {
  aiModel: string | null;
  authorized: boolean;
  isPending: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (configuration: CreateSyncJobDto) => Promise<void>;
}

const initialConfiguration: ScanConfiguration = {
  defaultTagIds: [],
  rangeMode: 'sinceLast',
};

const emptyChatOptions: TelegramChatScanOptionResponseDto[] = [];

const rangeLabels: Record<CreateSyncJobDto['rangeMode'], string> = {
  allHistory: '全部历史消息',
  custom: '自定义时间',
  last7Days: '最近 7 天',
  sinceLast: '从上次扫描',
};

export function ScanDialog({
  aiModel,
  authorized,
  isPending,
  open,
  onOpenChange,
  onSubmit,
}: ScanDialogProps) {
  const [configuration, setConfiguration] =
    useState<ScanConfiguration>(initialConfiguration);
  const [chatSelection, setChatSelection] = useState<string[] | null>(null);
  const [error, setError] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  const taxonomyQuery = useTaxonomy();
  const chatsQuery = useQuery({
    ...adminTelegramControllerScanOptionsOptions(),
    enabled: open && authorized,
  });
  useApiErrorToast(chatsQuery.error);
  useApiErrorToast(taxonomyQuery.error);
  const chats = chatsQuery.data?.items ?? emptyChatOptions;
  const allChatIds = chats.map((chat) => chat.id);
  const selectedChatIds = resolveScanChatIds(chats, chatSelection);
  const selectedChatIdSet = new Set(selectedChatIds);
  const visibleChats = filterScanChats(chats, chatSearch);

  function toggleChat(chatId: string) {
    setChatSelection((current) => toggleScanChat(allChatIds, current, chatId));
    setError('');
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedChatIds.length === 0) {
      setError('请至少选择一个可用的来源聊天。');
      return;
    }
    if (
      configuration.rangeMode === 'custom' &&
      (!configuration.rangeFrom ||
        !configuration.rangeTo ||
        configuration.rangeFrom > configuration.rangeTo)
    ) {
      setError('请选择有效的自定义起止时间。');
      return;
    }

    setError('');
    try {
      await onSubmit({
        chatIds: selectedChatIds,
        defaultCategoryId: configuration.defaultCategoryId,
        defaultProjectId: configuration.defaultProjectId,
        defaultTagIds: configuration.defaultTagIds,
        rangeFrom: configuration.rangeFrom
          ? new Date(configuration.rangeFrom).toISOString()
          : undefined,
        rangeMode: configuration.rangeMode,
        rangeTo: configuration.rangeTo
          ? new Date(configuration.rangeTo).toISOString()
          : undefined,
      });
      setConfiguration(initialConfiguration);
      setChatSelection(null);
      setChatSearch('');
      onOpenChange(false);
    } catch (caught) {
      setError(getAdminApiError(caught).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>开始扫描</DialogTitle>
          <DialogDescription>
            选择 Telegram 聊天、时间范围和新链接的默认整理属性。链接将由{' '}
            <span className="font-medium text-foreground">
              {aiModel ?? '未选择模型'}
            </span>{' '}
            识别。
          </DialogDescription>
        </DialogHeader>

        {!authorized ? (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>Telegram 尚未授权</AlertTitle>
            <AlertDescription>
              请先前往 Telegram 页面完成个人账号授权。
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={submit}>
            <FieldGroup>
              <FieldSet>
                <FieldLegend>来源聊天</FieldLegend>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <FieldDescription>
                    已选择 {selectedChatIds.length} / 共 {chats.length} 个聊天
                  </FieldDescription>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isPending || chats.length === 0}
                      onClick={() => {
                        setChatSelection(null);
                        setError('');
                      }}
                    >
                      全选
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isPending || chats.length === 0}
                      onClick={() => {
                        setChatSelection([]);
                        setError('请至少选择一个可用的来源聊天。');
                      }}
                    >
                      清空
                    </Button>
                  </div>
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
                  <Input
                    value={chatSearch}
                    onChange={(event) => setChatSearch(event.target.value)}
                    className="pl-9"
                    placeholder="搜索聊天名称或用户名"
                    aria-label="搜索扫描来源聊天"
                  />
                </div>
                <ScrollArea className="h-64 rounded-lg border">
                  <div className="grid gap-2 p-2 sm:grid-cols-2">
                    {chatsQuery.isPending ? (
                      <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                        正在读取聊天…
                      </p>
                    ) : null}
                    {visibleChats.map((chat) => (
                      <FieldLabel
                        key={chat.id}
                        className="cursor-pointer"
                        htmlFor={`scan-chat-${chat.id}`}
                      >
                        <Field orientation="horizontal">
                          <Checkbox
                            id={`scan-chat-${chat.id}`}
                            checked={selectedChatIdSet.has(chat.id)}
                            disabled={isPending}
                            onCheckedChange={() => toggleChat(chat.id)}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{chat.title}</p>
                            <p className="truncate text-xs font-normal text-muted-foreground">
                              {chat.username
                                ? `@${chat.username}`
                                : chat.telegramPeerId}
                            </p>
                          </div>
                        </Field>
                      </FieldLabel>
                    ))}
                    {!chatsQuery.isPending && visibleChats.length === 0 ? (
                      <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                        {chats.length === 0
                          ? '没有可扫描的聊天，请先在 Telegram 页面刷新聊天列表。'
                          : '没有匹配的聊天。'}
                      </p>
                    ) : null}
                  </div>
                </ScrollArea>
              </FieldSet>

              <Field>
                <FieldLabel htmlFor="scan-range">扫描范围</FieldLabel>
                <Select
                  value={configuration.rangeMode}
                  disabled={isPending}
                  onValueChange={(value) =>
                    setConfiguration((current) => ({
                      ...current,
                      rangeMode: String(value) as CreateSyncJobDto['rangeMode'],
                    }))
                  }
                >
                  <SelectTrigger id="scan-range" className="w-full">
                    <SelectValue>
                      {(value) =>
                        rangeLabels[value as CreateSyncJobDto['rangeMode']]
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(rangeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {configuration.rangeMode === 'custom' ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="scan-start-date">开始时间</FieldLabel>
                    <Input
                      id="scan-start-date"
                      type="datetime-local"
                      disabled={isPending}
                      value={configuration.rangeFrom ?? ''}
                      onChange={(event) =>
                        setConfiguration((current) => ({
                          ...current,
                          rangeFrom: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="scan-end-date">结束时间</FieldLabel>
                    <Input
                      id="scan-end-date"
                      type="datetime-local"
                      disabled={isPending}
                      value={configuration.rangeTo ?? ''}
                      onChange={(event) =>
                        setConfiguration((current) => ({
                          ...current,
                          rangeTo: event.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>
              ) : null}

              <FieldSet disabled={taxonomyQuery.isPending || isPending}>
                <FieldLegend>默认整理属性</FieldLegend>
                <FieldDescription>
                  可选。新链接会先进入待整理队列，默认值可以继续修改。
                </FieldDescription>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="scan-project">项目</FieldLabel>
                    <Select
                      value={configuration.defaultProjectId ?? 'none'}
                      onValueChange={(value) =>
                        setConfiguration((current) => ({
                          ...current,
                          defaultProjectId:
                            value === 'none' ? undefined : String(value),
                        }))
                      }
                    >
                      <SelectTrigger id="scan-project" className="w-full">
                        <SelectValue>
                          {(value) =>
                            value === 'none'
                              ? '不预设'
                              : (taxonomyQuery.taxonomy.projects.find(
                                  (item) => item.id === value,
                                )?.name ?? '未知项目')
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">不预设</SelectItem>
                        {taxonomyQuery.taxonomy.projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="scan-category">分类</FieldLabel>
                    <Select
                      value={configuration.defaultCategoryId ?? 'none'}
                      onValueChange={(value) =>
                        setConfiguration((current) => ({
                          ...current,
                          defaultCategoryId:
                            value === 'none' ? undefined : String(value),
                        }))
                      }
                    >
                      <SelectTrigger id="scan-category" className="w-full">
                        <SelectValue>
                          {(value) =>
                            value === 'none'
                              ? '不预设'
                              : (taxonomyQuery.taxonomy.categories.find(
                                  (item) => item.id === value,
                                )?.name ?? '未知分类')
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">不预设</SelectItem>
                        {taxonomyQuery.taxonomy.categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="scan-tags">标签</FieldLabel>
                  <TagPicker
                    id="scan-tags"
                    options={taxonomyQuery.taxonomy.tags}
                    value={configuration.defaultTagIds}
                    onChange={(defaultTagIds) =>
                      setConfiguration((current) => ({
                        ...current,
                        defaultTagIds,
                      }))
                    }
                  />
                </Field>
              </FieldSet>

              {error ? <FieldError>{error}</FieldError> : null}
            </FieldGroup>
            <DialogFooter className="mt-5">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button
                type="submit"
                disabled={
                  isPending ||
                  chatsQuery.isPending ||
                  selectedChatIds.length === 0
                }
              >
                {isPending ? <LoaderCircle className="animate-spin" /> : null}
                开始扫描
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

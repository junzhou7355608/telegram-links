import { TagPicker } from '@/components/features/tag-picker';
import type { DemoScanConfiguration } from '@/components/providers/demo-admin-context';
import { telegramChats } from '@/data/mock-data';
import type { DemoTaxonomyState } from '@/lib/admin-store';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';
import { Info } from 'lucide-react';
import { useState } from 'react';

interface ScanDialogProps {
  open: boolean;
  taxonomy: DemoTaxonomyState;
  onOpenChange: (open: boolean) => void;
  onSubmit: (configuration: DemoScanConfiguration) => void;
}

const initialConfiguration: DemoScanConfiguration = {
  chatIds: telegramChats.slice(0, 2).map((chat) => chat.id),
  defaultTagIds: [],
  rangeMode: 'sinceLast',
};

const rangeLabels: Record<DemoScanConfiguration['rangeMode'], string> = {
  allHistory: '全部历史消息',
  custom: '自定义时间',
  last7Days: '最近 7 天',
  sinceLast: '从上次扫描',
};

export function ScanDialog({
  open,
  taxonomy,
  onOpenChange,
  onSubmit,
}: ScanDialogProps) {
  const [configuration, setConfiguration] =
    useState<DemoScanConfiguration>(initialConfiguration);
  const [error, setError] = useState('');

  function toggleChat(chatId: string) {
    setConfiguration((current) => ({
      ...current,
      chatIds: current.chatIds.includes(chatId)
        ? current.chatIds.filter((id) => id !== chatId)
        : [...current.chatIds, chatId],
    }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (configuration.chatIds.length === 0) {
      setError('请至少选择一个来源聊天。');
      return;
    }
    if (
      configuration.rangeMode === 'custom' &&
      (!configuration.rangeFrom ||
        !configuration.rangeTo ||
        configuration.rangeFrom > configuration.rangeTo)
    ) {
      setError('请选择有效的自定义起止日期。');
      return;
    }

    setError('');
    onSubmit(configuration);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>开始模拟扫描</DialogTitle>
          <DialogDescription>
            选择聊天和时间范围。这个原型不会连接 Telegram 或请求服务端。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <FieldGroup>
            <FieldSet>
              <FieldLegend>来源聊天</FieldLegend>
              <div className="grid gap-2 sm:grid-cols-2">
                {telegramChats.map((chat) => (
                  <FieldLabel
                    key={chat.id}
                    className="cursor-pointer"
                    htmlFor={`scan-chat-${chat.id}`}
                  >
                    <Field orientation="horizontal">
                      <Checkbox
                        id={`scan-chat-${chat.id}`}
                        checked={configuration.chatIds.includes(chat.id)}
                        onCheckedChange={() => toggleChat(chat.id)}
                      />
                      <div>
                        <p className="font-medium">{chat.title}</p>
                        <p className="text-xs font-normal text-muted-foreground">
                          {chat.description}
                        </p>
                      </div>
                    </Field>
                  </FieldLabel>
                ))}
              </div>
            </FieldSet>

            <Field>
              <FieldLabel htmlFor="scan-range">扫描范围</FieldLabel>
              <Select
                value={configuration.rangeMode}
                onValueChange={(value) =>
                  setConfiguration((current) => ({
                    ...current,
                    rangeMode: String(
                      value,
                    ) as DemoScanConfiguration['rangeMode'],
                  }))
                }
              >
                <SelectTrigger id="scan-range" className="w-full">
                  <SelectValue>
                    {(value) =>
                      rangeLabels[value as DemoScanConfiguration['rangeMode']]
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
                  <FieldLabel htmlFor="scan-start-date">开始日期</FieldLabel>
                  <Input
                    id="scan-start-date"
                    type="date"
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
                  <FieldLabel htmlFor="scan-end-date">结束日期</FieldLabel>
                  <Input
                    id="scan-end-date"
                    type="date"
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

            <FieldSet>
              <FieldLegend>默认整理属性</FieldLegend>
              <FieldDescription>
                可选。新链接会先进入待整理队列，默认值可继续修改。
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
                            : (taxonomy.projects.find(
                                (item) => item.id === value,
                              )?.name ?? '未知项目')
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">不预设</SelectItem>
                      {taxonomy.projects.map((project) => (
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
                            : (taxonomy.categories.find(
                                (item) => item.id === value,
                              )?.name ?? '未知分类')
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">不预设</SelectItem>
                      {taxonomy.categories.map((category) => (
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
                  options={taxonomy.tags}
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
            <Alert>
              <Info />
              <AlertTitle>演示扫描</AlertTitle>
              <AlertDescription>
                流程会模拟连接、读取、提取、去重和保存，并生成固定演示记录。
              </AlertDescription>
            </Alert>
          </FieldGroup>
          <DialogFooter className="mt-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit">开始扫描</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

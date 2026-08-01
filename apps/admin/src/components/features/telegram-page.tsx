import type { TelegramSearch } from '@/lib/admin-search';
import { telegramChats } from '@/data/mock-data';
import { LinkPagination } from '@/components/features/link-pagination';
import { formatDateTime } from '@/lib/admin-store';
import { Alert, AlertDescription, AlertTitle } from '@repo/ui/components/alert';
import { Badge } from '@repo/ui/components/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/table';
import { Info, MessageCircleMore, Search } from 'lucide-react';

type SearchUpdater = (current: TelegramSearch) => TelegramSearch;

interface TelegramPageProps {
  search: TelegramSearch;
  onSearchChange: (updater: SearchUpdater) => void;
}

const typeLabels = {
  channel: '频道',
  group: '群组',
  private: '私聊',
  saved: '收藏夹',
} as const;

const PAGE_SIZE = 8;

export function TelegramPage({ search, onSearchChange }: TelegramPageProps) {
  const query = search.query?.toLocaleLowerCase() ?? '';
  const filteredChats = telegramChats.filter(
    (chat) =>
      (!search.type || chat.type === search.type) &&
      (!query ||
        [chat.title, chat.username, chat.telegramPeerId]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase()
          .includes(query)),
  );
  const pageCount = Math.max(1, Math.ceil(filteredChats.length / PAGE_SIZE));
  const page = Math.min(search.page, pageCount);
  const visibleChats = filteredChats.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  return (
    <section aria-labelledby="telegram-heading" className="grid gap-5">
      <div>
        <h2
          id="telegram-heading"
          className="text-xl font-semibold tracking-tight sm:text-2xl"
        >
          Telegram
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          账号授权和聊天来源将在正式接口对接阶段启用。
        </p>
      </div>

      <Alert>
        <Info />
        <AlertTitle>当前仅展示组件边界</AlertTitle>
        <AlertDescription>
          页面不会发送验证码、刷新聊天或修改扫描开关。
        </AlertDescription>
      </Alert>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircleMore className="size-4" />
            Telegram 账号
          </CardTitle>
          <CardDescription>尚未读取服务端授权状态</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="outline">等待接口对接</Badge>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row">
        <InputGroup className="h-9 flex-1">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            value={search.query ?? ''}
            onChange={(event) =>
              onSearchChange((current) => ({
                ...current,
                page: 1,
                query: event.target.value || undefined,
              }))
            }
            placeholder="搜索聊天名称、用户名或 Telegram ID"
            aria-label="搜索 Telegram 聊天"
          />
        </InputGroup>
        <Select
          value={search.type ?? 'all'}
          onValueChange={(value) =>
            onSearchChange((current) => ({
              ...current,
              page: 1,
              type:
                value === 'all'
                  ? undefined
                  : (String(value) as TelegramSearch['type']),
            }))
          }
        >
          <SelectTrigger className="w-full sm:w-36" aria-label="按聊天类型筛选">
            <SelectValue>
              {(value) =>
                value === 'all'
                  ? '全部类型'
                  : typeLabels[value as keyof typeof typeLabels]
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            {Object.entries(typeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>聊天</TableHead>
              <TableHead className="hidden sm:table-cell">类型</TableHead>
              <TableHead>扫描</TableHead>
              <TableHead className="hidden md:table-cell">最近同步</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleChats.map((chat) => (
              <TableRow key={chat.id}>
                <TableCell>
                  <p className="font-medium">{chat.title}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {chat.telegramPeerId}
                  </p>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {typeLabels[chat.type]}
                </TableCell>
                <TableCell>
                  <Badge variant={chat.isEnabled ? 'secondary' : 'outline'}>
                    {chat.isEnabled ? '已启用' : '未启用'}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {formatDateTime(chat.lastSyncedAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <LinkPagination
        page={page}
        pageCount={pageCount}
        total={filteredChats.length}
        onPageChange={(nextPage) =>
          onSearchChange((current) => ({ ...current, page: nextPage }))
        }
      />
    </section>
  );
}

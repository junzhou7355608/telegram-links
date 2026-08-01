import {
  adminTelegramControllerAccountOptions,
  adminTelegramControllerListChatsQueryKey,
  adminTelegramControllerListChatsOptions,
  adminTelegramControllerLogOutMutation,
  adminTelegramControllerRefreshChatsMutation,
  adminTelegramControllerSendCodeMutation,
  adminTelegramControllerUpdateChatMutation,
  adminTelegramControllerVerifyCodeMutation,
  adminTelegramControllerVerifyPasswordMutation,
} from '@/api/@tanstack/react-query.gen';
import { LinkPagination } from '@/components/features/link-pagination';
import { PageSkeleton } from '@/components/layouts/api-state';
import { useApiErrorToast } from '@/hooks/use-api-error-toast';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { ADMIN_CHAT_PAGE_SIZE, invalidateTelegram } from '@/lib/admin-api';
import { formatDateTime } from '@/lib/admin-display';
import { getAdminApiError } from '@/lib/api-error';
import type { TelegramSearch } from '@/lib/admin-search';
import {
  createTelegramAuthChallenge,
  requireTelegramPassword,
  telegramAuthChallengeAtom,
} from '@/stores/telegram-auth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui/components/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@repo/ui/components/alert';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { Checkbox } from '@repo/ui/components/checkbox';
import { Field, FieldError, FieldLabel } from '@repo/ui/components/field';
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
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useAtom } from 'jotai';
import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  LogOut,
  MessageCircleMore,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type SearchUpdater = (current: TelegramSearch) => TelegramSearch;

interface TelegramPageProps {
  search: TelegramSearch;
  onSearchChange: (
    updater: SearchUpdater,
    options?: { replace?: boolean },
  ) => void;
}

const typeLabels = {
  channel: '频道',
  group: '群组',
  private: '私聊',
  saved: '收藏夹',
} as const;

export function TelegramPage({ search, onSearchChange }: TelegramPageProps) {
  const queryClient = useQueryClient();
  const [challenge, setChallenge] = useAtom(telegramAuthChallengeAtom);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [updatingChatId, setUpdatingChatId] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState({
    source: search.query,
    value: search.query ?? '',
  });
  const searchValue =
    searchDraft.source === search.query
      ? searchDraft.value
      : (search.query ?? '');
  const debouncedSearch = useDebouncedValue(searchValue);

  const accountQuery = useQuery(adminTelegramControllerAccountOptions());
  const chatsQuery = useQuery({
    ...adminTelegramControllerListChatsOptions({
      query: {
        page: search.page,
        pageSize: ADMIN_CHAT_PAGE_SIZE,
        query: search.query,
        type: search.type,
      },
    }),
    placeholderData: keepPreviousData,
  });
  const sendCodeMutation = useMutation(
    adminTelegramControllerSendCodeMutation(),
  );
  const verifyCodeMutation = useMutation(
    adminTelegramControllerVerifyCodeMutation(),
  );
  const verifyPasswordMutation = useMutation(
    adminTelegramControllerVerifyPasswordMutation(),
  );
  const logoutMutation = useMutation(adminTelegramControllerLogOutMutation());
  const refreshMutation = useMutation(
    adminTelegramControllerRefreshChatsMutation(),
  );
  const updateChatMutation = useMutation(
    adminTelegramControllerUpdateChatMutation(),
  );
  useApiErrorToast(accountQuery.error);
  useApiErrorToast(chatsQuery.error);
  const authPending =
    sendCodeMutation.isPending ||
    verifyCodeMutation.isPending ||
    verifyPasswordMutation.isPending;
  const account = accountQuery.data;
  const pagination = chatsQuery.data?.pagination;

  useEffect(() => {
    const query = debouncedSearch.trim() || undefined;
    if (query !== search.query) {
      onSearchChange((current) => ({ ...current, page: 1, query }), {
        replace: true,
      });
    }
  }, [debouncedSearch, onSearchChange, search.query]);

  useEffect(() => {
    if (pagination && search.page > pagination.totalPages) {
      onSearchChange(
        (current) => ({ ...current, page: pagination.totalPages }),
        { replace: true },
      );
    }
  }, [onSearchChange, pagination, search.page]);

  async function sendCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError('');
    try {
      const result = await sendCodeMutation.mutateAsync({
        body: { phoneNumber: phoneNumber.trim() },
      });
      setChallenge(createTelegramAuthChallenge(result, phoneNumber.trim()));
      setCode('');
      toast.success(
        result.delivery === 'app'
          ? '验证码已发送到 Telegram 应用'
          : '验证码已通过短信发送',
      );
    } catch (error) {
      setAuthError(getAdminApiError(error).message);
    }
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge) {
      return;
    }
    setAuthError('');
    try {
      const result = await verifyCodeMutation.mutateAsync({
        body: { challengeId: challenge.challengeId, code: code.trim() },
      });
      setCode('');
      if (result.status === 'passwordRequired') {
        setChallenge(requireTelegramPassword(challenge));
        return;
      }
      setChallenge(null);
      await invalidateTelegram(queryClient);
      toast.success('Telegram 账号已授权');
    } catch (error) {
      const apiError = getAdminApiError(error);
      setAuthError(apiError.message);
      if (apiError.code === 'LOGIN_CHALLENGE_EXPIRED') {
        setChallenge(null);
      }
    }
  }

  async function verifyPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge) {
      return;
    }
    setAuthError('');
    try {
      await verifyPasswordMutation.mutateAsync({
        body: { challengeId: challenge.challengeId, password },
      });
      setPassword('');
      setChallenge(null);
      await invalidateTelegram(queryClient);
      toast.success('Telegram 账号已授权');
    } catch (error) {
      const apiError = getAdminApiError(error);
      setAuthError(apiError.message);
      if (apiError.code === 'LOGIN_CHALLENGE_EXPIRED') {
        setChallenge(null);
      }
    }
  }

  async function logout() {
    try {
      await logoutMutation.mutateAsync({});
      setChallenge(null);
      await invalidateTelegram(queryClient);
      toast.success('Telegram 会话已清除，已采集数据保持不变');
      setLogoutOpen(false);
    } catch (error) {
      toast.error(getAdminApiError(error).message);
    }
  }

  async function refreshChats() {
    try {
      const result = await refreshMutation.mutateAsync({});
      await invalidateTelegram(queryClient);
      toast.success(`已刷新 ${result.count} 个聊天`);
    } catch (error) {
      toast.error(getAdminApiError(error).message);
    }
  }

  async function updateChat(id: string, isEnabled: boolean) {
    setUpdatingChatId(id);
    try {
      await updateChatMutation.mutateAsync({
        body: { isEnabled },
        path: { id },
      });
      await queryClient.invalidateQueries({
        queryKey: adminTelegramControllerListChatsQueryKey(),
      });
      toast.success(isEnabled ? '已启用扫描来源' : '已停用扫描来源');
    } catch (error) {
      toast.error(getAdminApiError(error).message);
    } finally {
      setUpdatingChatId(null);
    }
  }

  return (
    <section aria-labelledby="telegram-heading" className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="telegram-heading"
            className="text-xl font-semibold tracking-tight sm:text-2xl"
          >
            Telegram
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            授权个人账号，并选择允许扫描的聊天来源。
          </p>
        </div>
        {account?.status === 'authorized' ? (
          <Button
            type="button"
            variant="outline"
            disabled={refreshMutation.isPending}
            onClick={() => void refreshChats()}
          >
            {refreshMutation.isPending ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <RefreshCw />
            )}
            刷新聊天
          </Button>
        ) : null}
      </div>

      {accountQuery.isPending ? <PageSkeleton rows={2} /> : null}

      {account && !account.configured ? (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Server 尚未配置 Telegram</AlertTitle>
          <AlertDescription>
            请在 Server 环境文件中配置 TELEGRAM_API_ID、TELEGRAM_API_HASH
            和会话加密密钥。
          </AlertDescription>
        </Alert>
      ) : null}

      {account?.configured && account.status === 'unauthorized' ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              授权 Telegram 账号
            </CardTitle>
            <CardDescription>
              验证码和 2FA 密码只用于本次请求，不会保存在浏览器中。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!challenge ? (
              <form
                onSubmit={sendCode}
                className="flex flex-col gap-3 sm:flex-row sm:items-end"
              >
                <Field className="flex-1">
                  <FieldLabel htmlFor="telegram-phone">手机号</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id="telegram-phone"
                      value={phoneNumber}
                      onChange={(event) => setPhoneNumber(event.target.value)}
                      placeholder="+8613800000000"
                      autoComplete="tel"
                      disabled={authPending}
                    />
                  </InputGroup>
                </Field>
                <Button
                  type="submit"
                  disabled={authPending || !phoneNumber.trim()}
                >
                  {authPending ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <Send />
                  )}
                  发送验证码
                </Button>
              </form>
            ) : challenge.stage === 'code' ? (
              <form onSubmit={verifyCode} className="grid gap-3">
                <p className="text-sm text-muted-foreground">
                  验证码已发送至 {challenge.phoneNumber}，有效期至{' '}
                  {formatDateTime(challenge.expiresAt)}。
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <Field className="flex-1">
                    <FieldLabel htmlFor="telegram-code">验证码</FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        id="telegram-code"
                        value={code}
                        onChange={(event) => setCode(event.target.value)}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        disabled={authPending}
                      />
                    </InputGroup>
                  </Field>
                  <Button type="submit" disabled={authPending || !code.trim()}>
                    {authPending ? (
                      <LoaderCircle className="animate-spin" />
                    ) : null}
                    验证
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={authPending}
                    onClick={() => setChallenge(null)}
                  >
                    重新发送
                  </Button>
                </div>
              </form>
            ) : (
              <form
                onSubmit={verifyPassword}
                className="flex flex-col gap-3 sm:flex-row sm:items-end"
              >
                <Field className="flex-1">
                  <FieldLabel htmlFor="telegram-password">2FA 密码</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id="telegram-password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      disabled={authPending}
                    />
                  </InputGroup>
                </Field>
                <Button type="submit" disabled={authPending || !password}>
                  {authPending ? (
                    <LoaderCircle className="animate-spin" />
                  ) : null}
                  完成授权
                </Button>
              </form>
            )}
            {authError ? (
              <FieldError className="mt-3">{authError}</FieldError>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {account?.status === 'authorized' && account.account ? (
        <Card size="sm">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircleMore className="size-4" />
                  {account.account.displayName ?? 'Telegram 账号'}
                </CardTitle>
                <CardDescription>
                  {account.account.username
                    ? `@${account.account.username}`
                    : (account.account.phoneNumber ??
                      account.account.telegramUserId)}
                </CardDescription>
              </div>
              <Badge variant="secondary">
                <CheckCircle2 />
                已授权
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLogoutOpen(true)}
            >
              <LogOut />
              清除会话
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <InputGroup className="h-9 flex-1">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            value={searchValue}
            onChange={(event) =>
              setSearchDraft({
                source: search.query,
                value: event.target.value,
              })
            }
            placeholder="搜索聊天名称或用户名"
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

      {chatsQuery.isPending ? (
        <PageSkeleton rows={5} />
      ) : (
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
              {chatsQuery.data?.items.map((chat) => (
                <TableRow key={chat.id}>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{chat.title}</p>
                      {!chat.isAvailable ? (
                        <Badge variant="outline">不可用</Badge>
                      ) : null}
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">
                      {chat.username
                        ? `@${chat.username}`
                        : chat.telegramPeerId}
                    </p>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {typeLabels[chat.type]}
                  </TableCell>
                  <TableCell>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={chat.isEnabled}
                        disabled={
                          updatingChatId === chat.id ||
                          (!chat.isAvailable && !chat.isEnabled)
                        }
                        onCheckedChange={(checked) =>
                          void updateChat(chat.id, checked === true)
                        }
                        aria-label={`${chat.isEnabled ? '停用' : '启用'} ${chat.title}`}
                      />
                      {updatingChatId === chat.id
                        ? '更新中'
                        : chat.isEnabled
                          ? '已启用'
                          : '未启用'}
                    </label>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatDateTime(chat.lastSyncedAt)}
                  </TableCell>
                </TableRow>
              ))}
              {chatsQuery.data?.items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-32 text-center text-muted-foreground"
                  >
                    没有聊天记录。授权后点击“刷新聊天”从 Telegram 获取列表。
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      )}

      <LinkPagination
        page={pagination?.page ?? search.page}
        pageCount={pagination?.totalPages ?? 1}
        total={pagination?.total ?? 0}
        onPageChange={(page) =>
          onSearchChange((current) => ({ ...current, page }))
        }
      />

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>清除 Telegram 会话？</AlertDialogTitle>
            <AlertDialogDescription>
              需要重新验证账号才能继续扫描；已采集的链接、聊天和任务记录不会删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={logoutMutation.isPending}
              onClick={() => void logout()}
            >
              清除会话
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

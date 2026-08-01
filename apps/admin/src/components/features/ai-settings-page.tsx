import {
  adminAiControllerClearKeyMutation,
  adminAiControllerModelsOptions,
  adminAiControllerSetKeyMutation,
  adminAiControllerSetModelMutation,
  adminAiControllerSettingsOptions,
  adminAiControllerSettingsQueryKey,
} from '@/api/@tanstack/react-query.gen';
import { useApiErrorToast } from '@/hooks/use-api-error-toast';
import { formatDateTime } from '@/lib/admin-display';
import { getAdminApiError } from '@/lib/api-error';
import { Alert, AlertDescription, AlertTitle } from '@repo/ui/components/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@repo/ui/components/alert-dialog';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@repo/ui/components/field';
import { Input } from '@repo/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BrainCircuit,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function AiSettingsPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery(adminAiControllerSettingsOptions());
  const modelsQuery = useQuery({
    ...adminAiControllerModelsOptions(),
    enabled: settingsQuery.data?.configured === true,
  });
  useApiErrorToast(settingsQuery.error);
  useApiErrorToast(modelsQuery.error);
  const setKeyMutation = useMutation(adminAiControllerSetKeyMutation());
  const setModelMutation = useMutation(adminAiControllerSetModelMutation());
  const clearKeyMutation = useMutation(adminAiControllerClearKeyMutation());
  const [apiKey, setApiKey] = useState('');
  const [modelDraft, setModelDraft] = useState({
    source: null as string | null,
    value: '',
  });
  const [keyError, setKeyError] = useState('');
  const [modelError, setModelError] = useState('');
  const settings = settingsQuery.data;
  const model =
    modelDraft.source === settings?.selectedModel
      ? modelDraft.value
      : (settings?.selectedModel ?? '');

  async function refreshSettings() {
    await queryClient.invalidateQueries({
      queryKey: adminAiControllerSettingsQueryKey(),
    });
  }

  async function saveKey(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!apiKey.trim()) {
      setKeyError('请输入 Kimi API Key。');
      return;
    }
    setKeyError('');
    try {
      await setKeyMutation.mutateAsync({ body: { apiKey: apiKey.trim() } });
      setApiKey('');
      await refreshSettings();
      await modelsQuery.refetch();
      toast.success('Kimi API Key 已验证并加密保存');
    } catch (caught) {
      setKeyError(getAdminApiError(caught).message);
    }
  }

  async function saveModel() {
    if (!model) {
      setModelError('请选择用于扫描的 Kimi 模型。');
      return;
    }
    setModelError('');
    try {
      await setModelMutation.mutateAsync({ body: { model } });
      await refreshSettings();
      toast.success('扫描模型已保存');
    } catch (caught) {
      setModelError(getAdminApiError(caught).message);
    }
  }

  async function clearKey() {
    try {
      await clearKeyMutation.mutateAsync({});
      setApiKey('');
      setModelDraft({ source: null, value: '' });
      await refreshSettings();
      queryClient.removeQueries({
        queryKey: adminAiControllerModelsOptions().queryKey,
      });
      toast.success('Kimi 配置已清除');
    } catch (caught) {
      toast.error(getAdminApiError(caught).message);
    }
  }

  const pending =
    setKeyMutation.isPending ||
    setModelMutation.isPending ||
    clearKeyMutation.isPending;

  return (
    <section aria-labelledby="ai-settings-heading" className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="ai-settings-heading"
            className="text-xl font-semibold tracking-tight sm:text-2xl"
          >
            AI 设置
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            配置 Kimi，让扫描任务根据 Telegram 消息上下文识别链接。
          </p>
        </div>
        <Badge variant={settings?.ready ? 'default' : 'secondary'}>
          {settings?.ready ? '可开始扫描' : '尚未就绪'}
        </Badge>
      </div>

      <Alert>
        <ShieldCheck />
        <AlertTitle>上下文与密钥说明</AlertTitle>
        <AlertDescription>
          API Key 只在 Server
          加密保存。扫描时会把当前消息、回复引用和十分钟内的相邻消息临时发送给
          Kimi；相邻消息不会写入数据库。
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="size-4" />
                Kimi API Key
              </CardTitle>
              {settings?.configured ? (
                <Badge variant="outline">
                  <CheckCircle2 /> 已配置
                </Badge>
              ) : null}
            </div>
            <CardDescription>
              保存前会读取 Kimi 模型列表验证 Key；验证失败不会覆盖原配置。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form id="kimi-key-form" onSubmit={saveKey}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="kimi-api-key">API Key</FieldLabel>
                  <Input
                    id="kimi-api-key"
                    type="password"
                    autoComplete="off"
                    value={apiKey}
                    disabled={pending}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder={
                      settings?.configured ? '输入新 Key 以替换' : 'sk-…'
                    }
                  />
                  <FieldDescription>
                    Key 不会写入浏览器存储，也不会出现在接口响应中。
                  </FieldDescription>
                  {keyError ? <FieldError>{keyError}</FieldError> : null}
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
          <CardFooter className="justify-between gap-2">
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="outline"
                    disabled={!settings?.configured || pending}
                  />
                }
              >
                清除配置
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>清除 Kimi 配置？</AlertDialogTitle>
                  <AlertDialogDescription>
                    API Key
                    和已选模型会被删除，之后无法创建扫描任务；已有识别结果不受影响。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={clearKey}>
                    确认清除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button type="submit" form="kimi-key-form" disabled={pending}>
              {setKeyMutation.isPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <ShieldCheck />
              )}
              验证并保存
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BrainCircuit className="size-4" />
              扫描模型
            </CardTitle>
            <CardDescription>
              模型列表来自 Kimi。为避免意外成本，系统不会自动选择模型。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="kimi-model">模型</FieldLabel>
                <Select
                  value={model}
                  disabled={
                    !settings?.configured || modelsQuery.isPending || pending
                  }
                  onValueChange={(value) =>
                    setModelDraft({
                      source: settings?.selectedModel ?? null,
                      value: String(value),
                    })
                  }
                >
                  <SelectTrigger id="kimi-model" className="w-full">
                    <SelectValue placeholder="选择 Kimi 模型">
                      {(value) =>
                        modelsQuery.data?.items.find(
                          (item) => item.id === value,
                        )?.id ?? '选择 Kimi 模型'
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {modelsQuery.data?.items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.id}
                        {item.supportsReasoning ? ' · 推理模型' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  最近验证：{formatDateTime(settings?.lastValidatedAt)}
                </FieldDescription>
              </Field>
              {modelError ? <FieldError>{modelError}</FieldError> : null}
            </FieldGroup>
          </CardContent>
          <CardFooter className="justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={
                !settings?.configured || modelsQuery.isFetching || pending
              }
              onClick={() => void modelsQuery.refetch()}
            >
              <RefreshCw
                className={modelsQuery.isFetching ? 'animate-spin' : undefined}
              />
              刷新模型
            </Button>
            <Button
              type="button"
              disabled={!model || pending}
              onClick={() => void saveModel()}
            >
              {setModelMutation.isPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <CheckCircle2 />
              )}
              保存模型
            </Button>
          </CardFooter>
        </Card>
      </div>
    </section>
  );
}

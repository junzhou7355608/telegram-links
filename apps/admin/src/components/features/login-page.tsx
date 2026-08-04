import {
  adminAuthControllerLoginMutation,
  adminAuthControllerSessionQueryKey,
} from '@/api/@tanstack/react-query.gen';
import { getAdminApiError } from '@/lib/api-error';
import { safeAdminRedirect } from '@/lib/admin-auth';
import { Button } from '@repo/ui/components/button';
import { Field, FieldError, FieldLabel } from '@repo/ui/components/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@repo/ui/components/input-group';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Link2,
  LoaderCircle,
  LockKeyhole,
  MessageCircleMore,
  Tag,
  UserRound,
} from 'lucide-react';
import { useState } from 'react';

interface LoginPageProps {
  redirect?: string;
}

function LinkJourney() {
  return (
    <div className="relative mt-14 max-w-xl" aria-hidden="true">
      <div className="absolute top-12 bottom-12 left-5 w-px bg-[#88abd3]/35" />
      <div className="grid gap-4">
        <div className="relative ml-9 rounded-2xl border border-white/12 bg-white/7 p-4 shadow-2xl shadow-black/10 backdrop-blur-sm">
          <span className="absolute top-5 -left-[2.8rem] flex size-5 items-center justify-center rounded-full border-4 border-[#192f4b] bg-[#e6ad59]" />
          <div className="flex items-center gap-2 text-xs text-[#c9d8e9]">
            <MessageCircleMore className="size-3.5" />
            Telegram · 08:42
          </div>
          <p className="mt-3 text-sm leading-6 text-white/90">
            这份资料后面还会用到，先收进链接库。
          </p>
          <div className="mt-3 rounded-xl bg-[#10243c]/75 px-3 py-2 font-mono text-xs text-[#9fc4ee]">
            https://example.com/research
          </div>
        </div>

        <div className="relative ml-16 rounded-2xl border border-[#88abd3]/25 bg-[#e8f0f8] p-4 text-[#192f4b] shadow-2xl shadow-black/15">
          <span className="absolute top-5 -left-[4.55rem] flex size-5 items-center justify-center rounded-full border-4 border-[#192f4b] bg-[#7fa8d6]" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-medium">
              <Link2 className="size-3.5" />
              已进入待整理
            </div>
            <ArrowRight className="size-3.5 text-[#5c7ca1]" />
          </div>
          <p className="mt-3 font-medium">Research notes</p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full bg-white/80 px-2.5 py-1">资料</span>
            <span className="flex items-center gap-1 rounded-full bg-[#d5e3f2] px-2.5 py-1">
              <Tag className="size-3" />
              待分类
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LoginPage({ redirect }: LoginPageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const loginMutation = useMutation(adminAuthControllerLoginMutation());
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [authError, setAuthError] = useState('');

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError('');
    try {
      const session = await loginMutation.mutateAsync({
        body: { password, username: username.trim() },
      });
      queryClient.setQueryData(adminAuthControllerSessionQueryKey(), session);
      await navigate({ href: safeAdminRedirect(redirect), replace: true });
    } catch (error) {
      setAuthError(getAdminApiError(error).message);
    }
  }

  return (
    <main
      id="admin-content"
      className="grid min-h-svh bg-[#f6f8fb] text-[#1b2b3f] lg:grid-cols-[minmax(0,1.08fr)_minmax(28rem,0.92fr)] dark:bg-[#0f1722] dark:text-[#e8eef5]"
    >
      <section className="relative hidden min-h-svh overflow-hidden bg-[#192f4b] px-12 py-10 text-white lg:flex lg:flex-col xl:px-16 xl:py-12">
        <div className="absolute -top-28 -right-24 size-80 rounded-full border border-[#88abd3]/20" />
        <div className="absolute -top-8 -right-44 size-[28rem] rounded-full border border-[#88abd3]/10" />
        <div className="relative flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#e6ad59] text-[#192f4b] shadow-lg shadow-black/15">
            <Link2 className="size-5" />
          </span>
          <div>
            <p className="font-semibold tracking-tight">个人链接库</p>
            <p className="font-mono text-[10px] tracking-[0.18em] text-[#a9bfd8] uppercase">
              Private workspace
            </p>
          </div>
        </div>

        <div className="relative my-auto py-10">
          <p className="font-mono text-xs tracking-[0.18em] text-[#9fc4ee] uppercase">
            管理工作台
          </p>
          <h1 className="mt-5 max-w-2xl text-4xl leading-[1.16] font-semibold tracking-[-0.035em] text-balance xl:text-5xl">
            把散落在对话里的链接，收回到自己的工作台。
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-[#c9d8e9]">
            授权 Telegram、扫描消息、整理分类。这里保存的是你的管理入口。
          </p>
          <LinkJourney />
        </div>

        <p className="relative text-xs text-[#91a9c4]">
          登录信息仅用于建立安全会话，不会保存在浏览器存储中。
        </p>
      </section>

      <section className="flex min-h-svh items-center justify-center px-5 py-10 sm:px-10 lg:px-14">
        <div className="w-full max-w-[25rem]">
          <div className="mb-9 flex items-center gap-3 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#192f4b] text-[#e6ad59] dark:bg-[#e6ad59] dark:text-[#192f4b]">
              <Link2 className="size-5" />
            </span>
            <div>
              <p className="font-semibold">个人链接库</p>
              <p className="text-xs text-muted-foreground">管理工作台</p>
            </div>
          </div>

          <div>
            <span className="flex size-11 items-center justify-center rounded-2xl border border-[#cbd8e7] bg-white text-[#31577f] shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-[#9fc4ee]">
              <LockKeyhole className="size-5" />
            </span>
            <h2 className="mt-6 text-3xl font-semibold tracking-[-0.03em]">
              登录管理端
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              输入部署时配置的用户名和密码，继续整理链接。
            </p>
          </div>

          <form onSubmit={login} className="mt-8 grid gap-5">
            <Field data-invalid={Boolean(authError)}>
              <FieldLabel htmlFor="admin-username">用户名</FieldLabel>
              <InputGroup className="h-11 bg-white shadow-sm dark:bg-white/5">
                <InputGroupAddon>
                  <UserRound />
                </InputGroupAddon>
                <InputGroupInput
                  id="admin-username"
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value);
                    setAuthError('');
                  }}
                  autoComplete="username"
                  autoFocus
                  aria-invalid={Boolean(authError)}
                  disabled={loginMutation.isPending}
                />
              </InputGroup>
            </Field>

            <Field data-invalid={Boolean(authError)}>
              <FieldLabel htmlFor="admin-password">密码</FieldLabel>
              <InputGroup className="h-11 bg-white shadow-sm dark:bg-white/5">
                <InputGroupAddon>
                  <LockKeyhole />
                </InputGroupAddon>
                <InputGroupInput
                  id="admin-password"
                  type={passwordVisible ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setAuthError('');
                  }}
                  autoComplete="current-password"
                  aria-describedby={authError ? 'admin-login-error' : undefined}
                  aria-invalid={Boolean(authError)}
                  disabled={loginMutation.isPending}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    type="button"
                    size="icon-xs"
                    aria-label={passwordVisible ? '隐藏密码' : '显示密码'}
                    disabled={loginMutation.isPending}
                    onClick={() => setPasswordVisible((visible) => !visible)}
                  >
                    {passwordVisible ? <EyeOff /> : <Eye />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </Field>

            {authError ? (
              <FieldError id="admin-login-error">{authError}</FieldError>
            ) : null}

            <Button
              type="submit"
              size="lg"
              className="mt-1 h-11 bg-[#315f8f] text-white shadow-lg shadow-[#315f8f]/15 hover:bg-[#274f79] dark:bg-[#7fa8d6] dark:text-[#10243c] dark:hover:bg-[#9fc4ee]"
              disabled={
                loginMutation.isPending || !username.trim() || !password
              }
            >
              {loginMutation.isPending ? (
                <LoaderCircle className="animate-spin" />
              ) : null}
              进入管理端
              {!loginMutation.isPending ? <ArrowRight /> : null}
            </Button>
          </form>

          <a
            href="/"
            className="mt-7 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ArrowLeft className="size-4" />
            返回公开链接库
          </a>
        </div>
      </section>
    </main>
  );
}

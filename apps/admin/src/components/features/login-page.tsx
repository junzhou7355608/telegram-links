import {
  adminAuthControllerLoginMutation,
  adminAuthControllerSessionQueryKey,
} from '@/api/@tanstack/react-query.gen';
import { getAdminApiError } from '@/lib/api-error';
import { safeAdminRedirect } from '@/lib/admin-auth';
import { Button } from '@repo/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

interface LoginPageProps {
  redirect?: string;
}

export function LoginPage({ redirect }: LoginPageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const loginMutation = useMutation(adminAuthControllerLoginMutation());
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
      className="flex min-h-svh w-full items-center justify-center p-6 md:p-10"
    >
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle>登录管理端</CardTitle>
            <CardDescription>输入部署时配置的用户名和密码。</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={login}>
              <FieldGroup>
                <Field data-invalid={Boolean(authError)}>
                  <FieldLabel htmlFor="admin-username">用户名</FieldLabel>
                  <Input
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
                    required
                  />
                </Field>

                <Field data-invalid={Boolean(authError)}>
                  <FieldLabel htmlFor="admin-password">密码</FieldLabel>
                  <Input
                    id="admin-password"
                    type="password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setAuthError('');
                    }}
                    autoComplete="current-password"
                    aria-describedby={
                      authError ? 'admin-login-error' : undefined
                    }
                    aria-invalid={Boolean(authError)}
                    disabled={loginMutation.isPending}
                    required
                  />
                  {authError ? (
                    <FieldError id="admin-login-error">{authError}</FieldError>
                  ) : null}
                </Field>

                <Field>
                  <Button
                    type="submit"
                    disabled={
                      loginMutation.isPending || !username.trim() || !password
                    }
                  >
                    {loginMutation.isPending ? '登录中…' : '登录'}
                  </Button>
                  <FieldDescription className="text-center">
                    <a href="/">返回公开链接库</a>
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

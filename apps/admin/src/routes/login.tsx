import { adminAuthControllerSessionOptions } from '@/api/@tanstack/react-query.gen';
import { LoginPage } from '@/components/features/login-page';
import { loginSearchSchema, safeAdminRedirect } from '@/lib/admin-auth';
import { queryClient } from '@/lib/query-client';
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/login')({
  validateSearch: loginSearchSchema,
  beforeLoad: async ({ search }) => {
    let authenticated = false;
    try {
      const session = await queryClient.ensureQueryData(
        adminAuthControllerSessionOptions(),
      );
      authenticated = session.authenticated;
    } catch {
      // Keep the login page available while Server is unreachable.
    }
    if (authenticated) {
      throw redirect({
        href: safeAdminRedirect(search.redirect),
        replace: true,
      });
    }
  },
  component: LoginRoute,
});

function LoginRoute() {
  const search = Route.useSearch();
  return <LoginPage redirect={search.redirect} />;
}

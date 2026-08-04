import { adminAuthControllerSessionOptions } from '@/api/@tanstack/react-query.gen';
import { AdminShell } from '@/components/layouts/admin-shell';
import { safeAdminRedirect } from '@/lib/admin-auth';
import { queryClient } from '@/lib/query-client';
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    let authenticated = false;
    try {
      const session = await queryClient.ensureQueryData(
        adminAuthControllerSessionOptions(),
      );
      authenticated = session.authenticated;
    } catch {
      // The login page will surface connection and configuration errors.
    }
    if (!authenticated) {
      throw redirect({
        to: '/login',
        replace: true,
        search: { redirect: safeAdminRedirect(location.href) },
      });
    }
  },
  component: AdminShell,
});

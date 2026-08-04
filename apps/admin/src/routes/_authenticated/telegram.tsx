import { TelegramPage } from '@/components/features/telegram-page';
import { telegramSearchSchema } from '@/lib/admin-search';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/telegram')({
  validateSearch: telegramSearchSchema,
  component: TelegramRoute,
});

function TelegramRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <TelegramPage
      search={search}
      onSearchChange={(updater, options) => {
        void navigate({ replace: options?.replace, search: updater });
      }}
    />
  );
}

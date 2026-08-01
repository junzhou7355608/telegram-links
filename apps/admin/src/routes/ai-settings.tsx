import { AiSettingsPage } from '@/components/features/ai-settings-page';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/ai-settings')({
  component: AiSettingsPage,
});

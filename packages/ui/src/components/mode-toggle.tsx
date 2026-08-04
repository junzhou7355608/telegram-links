import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@repo/ui/components/button';

type Theme = 'dark' | 'light' | 'system';

const themeIcons = {
  dark: Moon,
  light: Sun,
  system: Monitor,
} satisfies Record<Theme, typeof Sun>;

const nextThemes = {
  dark: 'system',
  light: 'dark',
  system: 'light',
} satisfies Record<Theme, Theme>;

function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const activeTheme: Theme =
    theme === 'light' || theme === 'dark' ? theme : 'system';
  const ActiveIcon = themeIcons[activeTheme];

  function cycleTheme() {
    setTheme(nextThemes[activeTheme]);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label="切换主题"
      onClick={cycleTheme}
    >
      <ActiveIcon />
    </Button>
  );
}

export { ModeToggle };

import { Button } from '@repo/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

type Theme = 'dark' | 'light' | 'system';

const themeOptions: readonly {
  value: Theme;
  label: string;
  icon: typeof Sun;
}[] = [
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'system', label: '跟随系统', icon: Monitor },
];

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const activeTheme: Theme =
    theme === 'light' || theme === 'dark' ? theme : 'system';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            aria-label="切换颜色主题"
            className="relative"
          />
        }
      >
        {activeTheme === 'light' ? <Sun /> : null}
        {activeTheme === 'dark' ? <Moon /> : null}
        {activeTheme === 'system' ? <Monitor /> : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>颜色主题</DropdownMenuLabel>
          {themeOptions.map((option) => {
            const Icon = option.icon;

            return (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setTheme(option.value)}
              >
                <Icon />
                {option.label}
                {activeTheme === option.value ? (
                  <Check className="ml-auto" />
                ) : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

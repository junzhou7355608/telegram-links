import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps as NextThemesProviderProps,
} from 'next-themes';

export function ThemeProvider(props: NextThemesProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="telegram-links-theme:v1"
      {...props}
    />
  );
}

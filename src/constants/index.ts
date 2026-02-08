/**
 * Single source of truth for theme IDs and titlebar colors.
 * Used by navbar, app store, and (optionally) preload.
 */

export const THEMES = [
  'dark',
  'light',
  'aqua',
  'cupcake',
  'dracula',
  'forest',
  'night',
  'synthwave',
  'winter',
] as const;

export type ThemeId = (typeof THEMES)[number];

const DARK_THEME_IDS = new Set<ThemeId>([
  'dark',
  'dracula',
  'aqua',
  'forest',
  'synthwave',
  'night',
]);

export const TITLEBAR_COLORS: Record<string, string> = {
  dark: 'rgb(25, 28, 32)',
  light: 'rgb(31, 36, 47)',
  aqua: 'rgb(53, 72, 136)',
  cupcake: '#6538b9',
  dracula: 'rgb(33, 33, 42)',
  forest: 'rgb(19, 17, 17)',
  night: 'rgb(17, 20, 32)',
  synthwave: 'rgb(16, 11, 41)',
  winter: 'rgb(56, 68, 93)',
};

export function getTitlebarColor(theme: string): string {
  return TITLEBAR_COLORS[theme] ?? TITLEBAR_COLORS.dark;
}

export function isDarkTheme(theme: string): boolean {
  return DARK_THEME_IDS.has(theme as ThemeId);
}

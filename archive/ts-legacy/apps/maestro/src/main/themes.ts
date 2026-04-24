/**
 * Theme exports for the main process
 *
 * This file re-exports themes from the shared location.
 * The canonical theme definitions are in src/shared/themes.ts
 */

export { THEMES, DEFAULT_CUSTOM_THEME_COLORS, getThemeById } from '../shared/themes';
export type { Theme, ThemeId, ThemeColors, ThemeMode } from '../shared/themes';

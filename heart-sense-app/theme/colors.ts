/**
 * Main app theme colors.
 * Use these for primary actions, icons, and light backgrounds.
 */

export const theme = {
  /** Primary brand color (buttons, links, icons, active states) */
  primary: "#8C0B0B",
  /** Light background for primary-themed areas (cards, highlights) */
  primaryLight: "#FFD3D6",
} as const;

export type ThemeColors = typeof theme;

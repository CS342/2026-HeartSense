/**
 * Main app theme colors.
 * Use these for primary actions, icons, and light backgrounds.
 */

export const theme = {
  /** Primary brand color (buttons, links, icons, active states) */
  primary: "#8C0B0B",
  /** Light background for primary-themed areas (cards, highlights) */
  primaryLight: "#FFD3D6",
  /** Accent colors for action cards and UI elements */
  symptom:   { bg: '#FFD6E7', icon: '#c2185b', border: '#f48fb1' },
  wellbeing: { bg: '#E8D5F5', icon: '#7b1fa2', border: '#ce93d8' },
  activity:  { bg: '#C8F5E1', icon: '#00796b', border: '#80cbc4' },
  medical:   { bg: '#FFE8B2', icon: '#e65100', border: '#ffcc80' },
} as const;

export type ThemeColors = typeof theme;

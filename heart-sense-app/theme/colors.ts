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

/** Surface / text colors for light and dark modes */
export const lightColors = {
  background: '#f9fafb',
  surface: '#ffffff',
  surfaceSecondary: '#f5f3ff',
  text: '#1a1a1a',
  textSecondary: '#666666',
  textTertiary: '#999999',
  border: '#e5e5e5',
  headerBg: theme.primary,
  headerText: '#ffffff',
  tabBar: '#ffffff',
  tabBarBorder: 'transparent',
  cardBg: '#ffffff',
  inputBg: '#f9fafb',
  modalBg: '#ffffff',
  overlay: 'rgba(0,0,0,0.5)',
  shadowColor: '#000',
};

export const darkColors = {
  background: '#121212',
  surface: '#1e1e1e',
  surfaceSecondary: '#1a1a2e',
  text: '#e0e0e0',
  textSecondary: '#a0a0a0',
  textTertiary: '#707070',
  border: '#333333',
  headerBg: '#1e1e1e',
  headerText: '#e0e0e0',
  tabBar: '#1e1e1e',
  tabBarBorder: '#333333',
  cardBg: '#2a2a2a',
  inputBg: '#2a2a2a',
  modalBg: '#1e1e1e',
  overlay: 'rgba(0,0,0,0.7)',
  shadowColor: '#000',
};

export type AppColors = typeof lightColors;

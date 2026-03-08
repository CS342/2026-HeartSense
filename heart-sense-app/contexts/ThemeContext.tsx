import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, AppColors } from '@/theme/colors';

const DARK_MODE_KEY = 'heartsense_dark_mode';
const FONT_SCALE_KEY = 'heartsense_font_scale';

interface ThemeContextType {
  isDark: boolean;
  toggleDarkMode: () => void;
  colors: AppColors;
  fontScale: number;
  setFontScale: (scale: number) => void;
  fs: (base: number) => number;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleDarkMode: () => {},
  colors: lightColors,
  fontScale: 1,
  setFontScale: () => {},
  fs: (base: number) => base,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [fontScale, setFontScaleState] = useState(1);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [darkVal, scaleVal] = await Promise.all([
          AsyncStorage.getItem(DARK_MODE_KEY),
          AsyncStorage.getItem(FONT_SCALE_KEY),
        ]);
        if (darkVal === 'true') setIsDark(true);
        if (scaleVal) setFontScaleState(parseFloat(scaleVal));
      } catch {}
      setLoaded(true);
    })();
  }, []);

  const toggleDarkMode = () => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(DARK_MODE_KEY, String(next));
      return next;
    });
  };

  const setFontScale = (scale: number) => {
    setFontScaleState(scale);
    AsyncStorage.setItem(FONT_SCALE_KEY, String(scale));
  };

  const fs = (base: number) => Math.round(base * fontScale);

  const colors = isDark ? darkColors : lightColors;

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ isDark, toggleDarkMode, colors, fontScale, setFontScale, fs }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

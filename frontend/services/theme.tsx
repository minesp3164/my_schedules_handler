import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type ThemeColors = {
  button: string;
  background: string;
};

type ThemePalette = {
  screen: string;
  surface: string;
  accent: string;
  accentSoft: string;
  line: string;
};

const defaultColors: ThemeColors = { button: '#2479CC', background: '#F5FAFF' };
const legacyThemes: Record<string, ThemeColors> = {
  blue: defaultColors,
  lavender: { button: '#7C5ACD', background: '#FAF7FF' },
};
const themeStorageKey = 'reward-tracker-theme';

export function isValidThemeColor(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

function mixWithWhite(hex: string, amount: number) {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
  const mixed = channels.map((channel) => Math.round(channel + (255 - channel) * amount));
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function paletteFor(colors: ThemeColors): ThemePalette {
  return {
    screen: colors.background,
    surface: '#FFFFFF',
    accent: colors.button,
    accentSoft: mixWithWhite(colors.button, 0.86),
    line: mixWithWhite(colors.button, 0.78),
  };
}

type ThemeContextValue = {
  colors: ThemeColors;
  palette: ThemePalette;
  setColors: (colors: ThemeColors) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

async function readTheme() {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(themeStorageKey) ?? null;
  return SecureStore.getItemAsync(themeStorageKey);
}

async function saveTheme(colors: ThemeColors) {
  const value = JSON.stringify(colors);
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(themeStorageKey, value);
    return;
  }
  await SecureStore.setItemAsync(themeStorageKey, value);
}

function parseTheme(value: string | null): ThemeColors | null {
  if (!value) return null;
  if (legacyThemes[value]) return legacyThemes[value];

  try {
    const parsed = JSON.parse(value) as Partial<ThemeColors>;
    if (isValidThemeColor(parsed.button ?? '') && isValidThemeColor(parsed.background ?? '')) {
      return { button: parsed.button!, background: parsed.background! };
    }
  } catch {
    return null;
  }

  return null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colors, setSelectedColors] = useState<ThemeColors>(defaultColors);

  useEffect(() => {
    readTheme().then((storedTheme) => {
      const parsed = parseTheme(storedTheme);
      if (parsed) setSelectedColors(parsed);
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors,
      palette: paletteFor(colors),
      setColors: (nextColors) => {
        setSelectedColors(nextColors);
        void saveTheme(nextColors);
      },
    }),
    [colors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('ThemeProvider가 필요합니다.');
  return context;
}

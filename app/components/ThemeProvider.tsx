'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type ThemeMode = 'dark' | 'light' | 'system';
type ResolvedTheme = 'dark' | 'light';

export interface ThemeColors {
  dark: Record<string, string>;
  light: Record<string, string>;
}

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
  mounted: boolean;
  // 自定义主题
  preset: string;
  colorOverrides: ThemeColors;
  applyPreset: (presetName: string, colors: ThemeColors) => void;
  setCustomColor: (key: string, value: string) => void;
  resetColors: () => void;
  isCustomizerOpen: boolean;
  setCustomizerOpen: (open: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  resolvedTheme: 'dark',
  setTheme: () => {},
  mounted: false,
  preset: 'default',
  colorOverrides: { dark: {}, light: {} },
  applyPreset: () => {},
  setCustomColor: () => {},
  resetColors: () => {},
  isCustomizerOpen: false,
  setCustomizerOpen: () => {},
});

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// 所有可能被自定义覆盖的 CSS 变量
const ALL_OVERRIDE_KEYS = [
  '--background', '--foreground', '--card', '--card-border', '--primary', '--muted',
  '--primary-foreground', '--primary-glow', '--ring', '--glass-bg', '--glass-border',
  '--card-foreground', '--secondary-foreground', '--accent-foreground', '--popover-foreground',
  '--popover', '--secondary', '--border', '--input', '--accent', '--muted-foreground',
];

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

/** 根据主要颜色自动计算派生颜色 */
export function computeDerivedColors(colors: Record<string, string>): Record<string, string> {
  const derived: Record<string, string> = {};

  if (colors['--primary']) {
    const rgb = hexToRgb(colors['--primary']);
    if (rgb) {
      derived['--primary-glow'] = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`;
      derived['--ring'] = colors['--primary'];
      const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
      derived['--primary-foreground'] = lum > 0.5 ? '#030303' : '#ffffff';
    }
  }

  if (colors['--background']) {
    const rgb = hexToRgb(colors['--background']);
    if (rgb) {
      derived['--glass-bg'] = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.85)`;
      const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
      derived['--glass-border'] = lum > 0.5
        ? 'rgba(0, 0, 0, 0.05)'
        : 'rgba(255, 255, 255, 0.06)';
    }
  }

  if (colors['--foreground']) {
    derived['--card-foreground'] = colors['--foreground'];
    derived['--secondary-foreground'] = colors['--foreground'];
    derived['--accent-foreground'] = colors['--foreground'];
    derived['--popover-foreground'] = colors['--foreground'];
  }

  if (colors['--card']) {
    derived['--popover'] = colors['--card'];
  }

  if (colors['--card-border']) {
    derived['--border'] = colors['--card-border'];
    derived['--input'] = colors['--card-border'];
    derived['--accent'] = colors['--card-border'];
    derived['--secondary'] = colors['--card-border'];
  }

  if (colors['--muted']) {
    derived['--muted-foreground'] = colors['--muted'];
  }

  return derived;
}

/** 将自定义颜色应用到 DOM */
function applyColors(mode: ResolvedTheme, overrides: ThemeColors) {
  const root = document.documentElement;

  // 清除所有自定义内联样式
  ALL_OVERRIDE_KEYS.forEach(key => root.style.removeProperty(key));

  const colors = overrides[mode];
  if (!colors || Object.keys(colors).length === 0) return;

  // 应用主要颜色
  Object.entries(colors).forEach(([key, val]) => root.style.setProperty(key, val));

  // 应用派生颜色
  const derived = computeDerivedColors(colors);
  Object.entries(derived).forEach(([key, val]) => root.style.setProperty(key, val));
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark');
  const [mounted, setMounted] = useState(false);
  const [preset, setPresetState] = useState('default');
  const [colorOverrides, setColorOverrides] = useState<ThemeColors>({ dark: {}, light: {} });
  const [isCustomizerOpen, setCustomizerOpen] = useState(false);

  // 初始化
  useEffect(() => {
    const savedTheme = (localStorage.getItem('theme') as ThemeMode) || 'system';
    setThemeState(savedTheme);

    const resolved = savedTheme === 'system' ? getSystemTheme() : savedTheme;
    setResolvedTheme(resolved);
    document.documentElement.setAttribute('data-theme', resolved);

    // 读取自定义颜色
    const savedPreset = localStorage.getItem('theme-preset') || 'default';
    setPresetState(savedPreset);

    try {
      const savedColors = localStorage.getItem('theme-colors');
      if (savedColors) {
        const parsed = JSON.parse(savedColors) as ThemeColors;
        setColorOverrides(parsed);
      }
    } catch {
      // ignore
    }

    setMounted(true);
  }, []);

  // 当 resolvedTheme 或 colorOverrides 变化时应用颜色
  useEffect(() => {
    if (!mounted) return;
    applyColors(resolvedTheme, colorOverrides);
  }, [resolvedTheme, colorOverrides, mounted]);

  // 监听系统主题变化
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light';
      setResolvedTheme(newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);

    const resolved = newTheme === 'system' ? getSystemTheme() : newTheme;
    setResolvedTheme(resolved);
    document.documentElement.setAttribute('data-theme', resolved);
  }, []);

  const applyPreset = useCallback((name: string, colors: ThemeColors) => {
    setPresetState(name);
    setColorOverrides(colors);
    localStorage.setItem('theme-preset', name);
    localStorage.setItem('theme-colors', JSON.stringify(colors));
  }, []);

  const setCustomColor = useCallback((key: string, value: string) => {
    setColorOverrides(prev => {
      const currentMode = (document.documentElement.getAttribute('data-theme') as ResolvedTheme) || 'dark';
      const updated = {
        ...prev,
        [currentMode]: { ...prev[currentMode], [key]: value },
      };
      localStorage.setItem('theme-colors', JSON.stringify(updated));
      return updated;
    });
    setPresetState('custom');
    localStorage.setItem('theme-preset', 'custom');
  }, []);

  const resetColors = useCallback(() => {
    const empty: ThemeColors = { dark: {}, light: {} };
    setColorOverrides(empty);
    setPresetState('default');
    localStorage.setItem('theme-colors', JSON.stringify(empty));
    localStorage.setItem('theme-preset', 'default');
  }, []);

  return (
    <ThemeContext.Provider value={{
      theme, resolvedTheme, setTheme, mounted,
      preset, colorOverrides, applyPreset, setCustomColor, resetColors,
      isCustomizerOpen, setCustomizerOpen,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

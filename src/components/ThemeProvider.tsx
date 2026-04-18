// ============================================================
// SWAN · HUB — Theme Provider
// Gère les 4 thèmes (night-gold, sun, office, comfort)
// Persiste le choix dans localStorage + Supabase (si connecté)
// ============================================================

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import type { ThemeId } from '@/config/tokens';

const STORAGE_KEY = 'swan_theme';
const DEFAULT_THEME: ThemeId = 'night-gold';

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ── Détection dark/light pour chaque thème ────────────────────
const DARK_THEMES: ThemeId[] = ['night-gold', 'comfort'];

function isDarkTheme(theme: ThemeId): boolean {
  return DARK_THEMES.includes(theme);
}

// ── Application du thème au DOM ───────────────────────────────
function applyThemeToDOM(theme: ThemeId): void {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);

  // Mise à jour de la meta theme-color pour la barre de statut mobile
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  const bgColors: Record<ThemeId, string> = {
    'night-gold': '#080808',
    'sun':        '#F7F5F0',
    'office':     '#F4F4F6',
    'comfort':    '#1C1814',
  };
  if (metaTheme) {
    metaTheme.setAttribute('content', bgColors[theme]);
  }
}

// ── Récupération du thème initial ─────────────────────────────
function getInitialTheme(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    if (stored && ['night-gold', 'sun', 'office', 'comfort'].includes(stored)) {
      return stored;
    }
  } catch {
    // localStorage unavailable
  }
  return DEFAULT_THEME;
}

// ── Provider ──────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(getInitialTheme);

  // Appliquer le thème dès le premier rendu
  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  const setTheme = useCallback((newTheme: ThemeId) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // localStorage unavailable
    }
    applyThemeToDOM(newTheme);
  }, []);

  const value: ThemeContextType = {
    theme,
    setTheme,
    isDark: isDarkTheme(theme),
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────
export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}

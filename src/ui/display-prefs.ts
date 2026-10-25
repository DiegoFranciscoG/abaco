import type { MotionPreference, ThemePreference } from '../data/types';

/**
 * Theme and motion preferences cached in localStorage so they apply before the first paint
 * (public/boot.js reads the same key) without loading IndexedDB up front. They are display settings,
 * not personal data. The profile in IndexedDB stays the source of truth: PreferencesSync copies it here.
 */
export interface DisplayPrefs {
  tema: ThemePreference;
  movimiento: MotionPreference;
}

export const DISPLAY_PREFS_KEY = 'abaco:pantalla';
const DEFAULT_PREFS: DisplayPrefs = { tema: 'system', movimiento: 'system' };

export function parseDisplayPrefs(raw: string | null): DisplayPrefs {
  if (!raw) return DEFAULT_PREFS;
  try {
    const value = JSON.parse(raw) as Partial<Record<keyof DisplayPrefs, unknown>> | null;
    return {
      tema: value?.tema === 'light' || value?.tema === 'dark' ? value.tema : 'system',
      movimiento: value?.movimiento === 'reduce' || value?.movimiento === 'full' ? value.movimiento : 'system',
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function readStored(): DisplayPrefs {
  try {
    return parseDisplayPrefs(localStorage.getItem(DISPLAY_PREFS_KEY));
  } catch {
    return DEFAULT_PREFS;
  }
}

let current = readStored();
const listeners = new Set<() => void>();

export function getDisplayPrefs(): DisplayPrefs {
  return current;
}

export function subscribeDisplayPrefs(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setDisplayPrefs(next: Partial<DisplayPrefs>): void {
  const merged = { ...current, ...next };
  if (merged.tema === current.tema && merged.movimiento === current.movimiento) return;
  current = merged;
  try {
    localStorage.setItem(DISPLAY_PREFS_KEY, JSON.stringify(current));
  } catch {
    // Storage blocked: the preference lasts for this visit only.
  }
  listeners.forEach((listener) => listener());
}

/** "Empezar de cero" also forgets the cached display preferences. */
export function resetDisplayPrefs(): void {
  try {
    localStorage.removeItem(DISPLAY_PREFS_KEY);
  } catch {
    // Nothing stored.
  }
  current = DEFAULT_PREFS;
  listeners.forEach((listener) => listener());
}

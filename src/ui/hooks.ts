import { useEffect, useState, useSyncExternalStore } from 'react';
import { getDisplayPrefs, subscribeDisplayPrefs, type DisplayPrefs } from './display-prefs';

export function useDisplayPrefs(): DisplayPrefs {
  return useSyncExternalStore(subscribeDisplayPrefs, getDisplayPrefs, getDisplayPrefs);
}

function subscribeMedia(query: string) {
  return (callback: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener('change', callback);
    return () => mql.removeEventListener('change', callback);
  };
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    subscribeMedia(query),
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Effective reduced-motion preference: the student's choice wins over the system setting. */
export function useReducedMotion(): boolean {
  const profile = useDisplayPrefs();
  const system = useMediaQuery('(prefers-reduced-motion: reduce)');
  if (profile.movimiento === 'reduce') return true;
  if (profile.movimiento === 'full') return false;
  return system;
}

export function useEffectiveTheme(): 'light' | 'dark' {
  const profile = useDisplayPrefs();
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  if (profile.tema === 'system') return systemDark ? 'dark' : 'light';
  return profile.tema;
}

/** Keeps <html data-theme> and <html data-motion> in sync with the display preferences. */
export function useApplyPreferences(): void {
  const theme = useEffectiveTheme();
  const reduce = useReducedMotion();
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.motion = reduce ? 'reduce' : 'full';
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', theme === 'dark' ? '#15110e' : '#fbf6ef');
  }, [theme, reduce]);
}

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

export type AsyncState<T> =
  { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; error: Error };

/** Loads static content on demand (lazy JSON chunks). */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  // The result is tagged with the dependencies it belongs to, so a change of deps reads as "loading"
  // without resetting state inside the effect.
  const key = JSON.stringify(deps);
  const [state, setState] = useState<{ key: string; value: AsyncState<T> } | null>(null);
  useEffect(() => {
    let alive = true;
    load().then(
      (data) => alive && setState({ key, value: { status: 'ready', data } }),
      (error: unknown) =>
        alive &&
        setState({
          key,
          value: { status: 'error', error: error instanceof Error ? error : new Error(String(error)) },
        }),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state && state.key === key ? state.value : { status: 'loading' };
}

export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ÁBACO` : 'ÁBACO — estudia tus materias tema por tema';
  }, [title]);
}

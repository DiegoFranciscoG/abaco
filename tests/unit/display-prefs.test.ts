import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CSP_HEADER, CSP_META } from '../../csp.config';
import {
  DISPLAY_PREFS_KEY,
  getDisplayPrefs,
  parseDisplayPrefs,
  resetDisplayPrefs,
  setDisplayPrefs,
  subscribeDisplayPrefs,
} from '../../src/ui/display-prefs';

describe('display preferences cache', () => {
  afterEach(() => resetDisplayPrefs());

  it('parses only known values and falls back to the system setting', () => {
    expect(parseDisplayPrefs(null)).toEqual({ tema: 'system', movimiento: 'system' });
    expect(parseDisplayPrefs('{"tema":"dark","movimiento":"reduce"}')).toEqual({
      tema: 'dark',
      movimiento: 'reduce',
    });
    expect(parseDisplayPrefs('{"tema":"<script>","movimiento":42}')).toEqual({
      tema: 'system',
      movimiento: 'system',
    });
    expect(parseDisplayPrefs('no es json')).toEqual({ tema: 'system', movimiento: 'system' });
    expect(parseDisplayPrefs('null')).toEqual({ tema: 'system', movimiento: 'system' });
  });

  it('stores the choice, notifies subscribers once and forgets it on reset', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeDisplayPrefs(listener);
    setDisplayPrefs({ tema: 'dark' });
    setDisplayPrefs({ tema: 'dark' });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getDisplayPrefs()).toEqual({ tema: 'dark', movimiento: 'system' });
    expect(JSON.parse(localStorage.getItem(DISPLAY_PREFS_KEY) ?? '{}')).toEqual({
      tema: 'dark',
      movimiento: 'system',
    });
    resetDisplayPrefs();
    expect(localStorage.getItem(DISPLAY_PREFS_KEY)).toBeNull();
    expect(getDisplayPrefs().tema).toBe('system');
    unsubscribe();
  });

  it('keeps working when storage is blocked', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(() => setDisplayPrefs({ movimiento: 'reduce' })).not.toThrow();
    expect(getDisplayPrefs().movimiento).toBe('reduce');
    spy.mockRestore();
  });

  it('boot.js reads the same storage key', () => {
    expect(readFileSync('public/boot.js', 'utf8')).toContain(`'${DISPLAY_PREFS_KEY}'`);
  });
});

describe('content security policy', () => {
  it('nginx sends exactly the policy used in the <meta> tag plus frame-ancestors', () => {
    const nginx = readFileSync('nginx.conf', 'utf8');
    const header = /add_header Content-Security-Policy "([^"]+)" always;/.exec(nginx)?.[1];
    expect(header).toBe(CSP_HEADER);
    expect(CSP_HEADER.startsWith(CSP_META)).toBe(true);
    expect(CSP_HEADER).toContain("frame-ancestors 'none'");
  });

  it('never allows inline or evaluated scripts', () => {
    const scriptSrc = CSP_META.split('; ').find((d) => d.startsWith('script-src'));
    expect(scriptSrc).toBe("script-src 'self'");
    expect(CSP_META).not.toContain('unsafe-eval');
  });
});

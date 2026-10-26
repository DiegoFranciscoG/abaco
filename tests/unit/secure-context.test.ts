import { afterEach, describe, expect, it, vi } from 'vitest';
import { newId } from '../../src/domain/id';
import { copyText } from '../../src/ui/clipboard';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** A phone that opens the app on the local network over http is not a secure context. */
describe('sin contexto seguro (http en la red local)', () => {
  it('creates valid, distinct ids without crypto.randomUUID', () => {
    const real = globalThis.crypto;
    vi.stubGlobal('crypto', { getRandomValues: real.getRandomValues.bind(real) });
    expect(typeof crypto.randomUUID).toBe('undefined');
    const ids = Array.from({ length: 200 }, newId);
    for (const id of ids) expect(id).toMatch(UUID_V4);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('copies with the older copy command when navigator.clipboard is missing', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined });
    const exec = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', { value: exec, configurable: true });
    await copyText('Enlace del taller');
    expect(exec).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();
    exec.mockReturnValue(false);
    await expect(copyText('otra vez')).rejects.toThrow();
  });
});

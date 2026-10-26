import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { collectThirdParty, isAllowed, renderNotices } from '../../scripts/licenses';
import pkg from '../../package.json';

const root = join(__dirname, '..', '..');

describe('licencias de terceros', () => {
  it('accepts permissive licenses and SPDX expressions, rejects copyleft and unknown', () => {
    for (const ok of [
      'MIT',
      'Apache-2.0',
      '0BSD',
      'OFL-1.1',
      '(MIT OR Apache-2.0)',
      'MIT AND ISC',
      '(GPL-3.0 OR MIT)',
    ])
      expect(isAllowed(ok), ok).toBe(true);
    for (const bad of [
      'GPL-3.0',
      'AGPL-3.0',
      'UNKNOWN',
      'CC-BY-NC-4.0',
      'MIT AND GPL-2.0',
      'SEE LICENSE IN LICENSE',
    ])
      expect(isAllowed(bad), bad).toBe(false);
  });

  it('every library shipped to the browser has an allowed license and its notice text', () => {
    const packages = collectThirdParty(root);
    const names = packages.map((p) => p.name);
    for (const dep of Object.keys(pkg.dependencies)) expect(names, dep).toContain(dep);
    expect(names).toContain('workbox-precaching');
    expect(names.some((n) => n.startsWith('@types/'))).toBe(false);
    for (const p of packages) {
      expect(isAllowed(p.license), `${p.name}: ${p.license}`).toBe(true);
      expect(p.noticeText.length, `${p.name} sin texto de licencia`).toBeGreaterThan(50);
    }
    const text = renderNotices(packages);
    expect(text).toContain('react 19.3.1 — MIT');
    expect(text).toContain('Licencia: OFL-1.1');
  });
});

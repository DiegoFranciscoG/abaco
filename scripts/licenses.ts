/**
 * Third-party notices of everything ÁBACO ships to the browser: the production dependencies of package-lock.json
 * plus the Workbox runtime that vite-plugin-pwa bundles into the service worker. Every license must be in the
 * allowlist (permissive licenses compatible with publishing ÁBACO under MIT); anything else fails the build.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const ALLOWED_LICENSES = new Set(['MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', '0BSD', 'OFL-1.1', 'CC0-1.0', 'Unlicense']);

/** Modules of Workbox that generateSW copies into the published service worker. */
const SERVICE_WORKER_RUNTIME = ['workbox-core', 'workbox-precaching', 'workbox-routing', 'workbox-strategies', 'workbox-expiration', 'workbox-cacheable-response'];

export interface ThirdPartyPackage {
  name: string;
  version: string;
  license: string;
  homepage: string;
  noticeText: string;
}

interface LockEntry {
  version?: string;
  license?: string;
  dev?: boolean;
  devOptional?: boolean;
}

interface PackageJson {
  version?: string;
  license?: string | { type?: string };
  licenses?: { type?: string }[];
  homepage?: string;
  repository?: string | { url?: string };
}

function licenseOf(pkg: PackageJson, lock: LockEntry | undefined): string {
  if (typeof pkg.license === 'string') return pkg.license;
  if (pkg.license?.type) return pkg.license.type;
  if (pkg.licenses?.length) return pkg.licenses.map((l) => l.type ?? 'UNKNOWN').join(' OR ');
  return lock?.license ?? 'UNKNOWN';
}

function homepageOf(pkg: PackageJson): string {
  const repo = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;
  return (pkg.homepage ?? repo ?? '').replace(/^git\+/, '').replace(/\.git$/, '');
}

function noticeOf(dir: string): string {
  return readdirSync(dir)
    .filter((f) => /^(licen[cs]e|copying|notice)(\.(md|txt))?$/i.test(f))
    .sort()
    .map((f) => readFileSync(join(dir, f), 'utf8').trim())
    .join('\n\n');
}

/** True when every alternative of an SPDX expression such as "(MIT OR Apache-2.0)" is acceptable, or at least one of an OR. */
export function isAllowed(expression: string): boolean {
  const clean = expression.replace(/[()]/g, '').trim();
  if (clean.includes(' OR ')) return clean.split(' OR ').some((part) => isAllowed(part));
  if (clean.includes(' AND ')) return clean.split(' AND ').every((part) => isAllowed(part));
  return ALLOWED_LICENSES.has(clean);
}

export function collectThirdParty(root: string): ThirdPartyPackage[] {
  const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8')) as { packages: Record<string, LockEntry> };
  const names = new Set<string>();
  for (const [path, entry] of Object.entries(lock.packages)) {
    if (!path.startsWith('node_modules/') || entry.dev || entry.devOptional) continue;
    const name = path.slice(path.lastIndexOf('node_modules/') + 'node_modules/'.length);
    // Type-only packages never reach the browser.
    if (!name.startsWith('@types/')) names.add(name);
  }
  for (const name of SERVICE_WORKER_RUNTIME) names.add(name);

  return [...names].sort().map((name) => {
    const dir = join(root, 'node_modules', name);
    if (!existsSync(join(dir, 'package.json'))) throw new Error(`No se encontró ${name} en node_modules: ejecuta npm ci.`);
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as PackageJson;
    return {
      name,
      version: pkg.version ?? lock.packages[`node_modules/${name}`]?.version ?? '',
      license: licenseOf(pkg, lock.packages[`node_modules/${name}`]),
      homepage: homepageOf(pkg),
      noticeText: noticeOf(dir),
    };
  });
}

export function renderNotices(packages: ThirdPartyPackage[]): string {
  const header = [
    'ÁBACO — avisos de software de terceros',
    '',
    'ÁBACO se publica con licencia MIT. Incluye las siguientes bibliotecas de terceros, cada una con su propia',
    'licencia, cuyo texto se reproduce abajo tal como lo publican sus autores.',
    '',
    ...packages.map((p) => `- ${p.name} ${p.version} — ${p.license}`),
    '',
  ];
  const blocks = packages.map((p) =>
    [`${'='.repeat(78)}`, `${p.name} ${p.version}`, `Licencia: ${p.license}`, p.homepage ? `Origen: ${p.homepage}` : '', '', p.noticeText || '(El paquete no incluye un archivo de licencia; rige la licencia declarada arriba.)', '']
      .filter((line, i) => line !== '' || i !== 3)
      .join('\n'),
  );
  return `${header.join('\n')}\n${blocks.join('\n')}`;
}

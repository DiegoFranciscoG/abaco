/** Writes public/licencias-terceros.txt and fails when a shipped dependency has a license outside the allowlist. */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { collectThirdParty, isAllowed, renderNotices } from './licenses.ts';

const root = join(import.meta.dirname, '..');
const packages = collectThirdParty(root);
const rejected = packages.filter((p) => !isAllowed(p.license));
if (rejected.length > 0) {
  console.error(`Licencias no permitidas: ${rejected.map((p) => `${p.name} (${p.license})`).join(', ')}`);
  process.exit(1);
}
writeFileSync(join(root, 'public', 'licencias-terceros.txt'), renderNotices(packages));
console.log(`Licencias de terceros: ${packages.length} paquetes, todas permitidas.`);

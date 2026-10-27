/**
 * Declares each subject "completa" or "parcial" in content/materias.json from what the depth standard measures, so
 * the declaration never runs ahead of the content (test T-17 checks the same rule). Run after `npm run ficha`.
 *   node scripts/estado-cobertura.ts
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { materiaCoverage } from '../src/domain/content/coverage.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (file: string) => JSON.parse(readFileSync(join(root, 'content', file), 'utf8'));
const materias = read('materias.json');
const ejercicios = read('ejercicios.json');
const temarios = new Map(
  readdirSync(join(root, 'content', 'temarios')).map((f) => {
    const t = read(`temarios/${f}`);
    return [t.materia, t];
  }),
);
const changes: string[] = [];
for (const m of materias) {
  const temario = temarios.get(m.id);
  if (!temario) continue;
  const estado = materiaCoverage(m, temario, ejercicios).cumple ? 'completa' : 'parcial';
  if (m.cobertura.estado !== estado) changes.push(`${m.id}: ${m.cobertura.estado} → ${estado}`);
  m.cobertura.estado = estado;
}
writeFileSync(join(root, 'content', 'materias.json'), JSON.stringify(materias, null, 2) + '\n');
console.log(changes.length ? changes.join('\n') : 'Sin cambios de estado.');

/**
 * Writes docs/cobertura.md from the content: state of every subject against the depth standard, the repetition map
 * and the coverage by career and cycle. Run with `npm run cobertura` after adding content (T-17 fails otherwise).
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { materiaCoverage, type CoverageReport } from '../src/domain/content/coverage.ts';
import { coverageMarkdown } from '../src/domain/content/coverage-report.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (file: string) => JSON.parse(readFileSync(join(root, 'content', file), 'utf8'));
const materias = read('materias.json');
const carreras = read('carreras.json');
const ejercicios = read('ejercicios.json');
const repeticion = read('repeticion.json');
const temarios = readdirSync(join(root, 'content', 'temarios')).map((f) => read(`temarios/${f}`));

const reports = new Map<string, CoverageReport>();
for (const m of materias) {
  const temario = temarios.find((t: { materia: string }) => t.materia === m.id);
  if (temario) reports.set(m.id, materiaCoverage(m, temario, ejercicios));
}
writeFileSync(
  join(root, 'docs', 'cobertura.md'),
  coverageMarkdown({ materias, carreras, reports, repeticion }),
);
const complete = [...reports.values()].filter((r) => r.cumple).length;
console.log(`docs/cobertura.md actualizado: ${complete} de ${reports.size} materias cumplen el estándar.`);

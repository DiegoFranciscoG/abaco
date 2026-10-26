/**
 * Builds the search index at compile time (MiniSearch) so the app does not index ~900 documents on the phone.
 * Run with `node scripts/build-search-index.ts` (Node ≥ 22.18 strips TypeScript types natively).
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import MiniSearch from 'minisearch';
import { buildSearchDocuments, SEARCH_OPTIONS, type SearchContent } from '../src/domain/search/index-data.ts';
import { TOOLS } from '../src/domain/tools/catalog.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'content');
const read = <T>(file: string): T => JSON.parse(readFileSync(join(contentDir, file), 'utf8')) as T;
const list = (dir: string): string[] => readdirSync(join(contentDir, dir)).filter((f) => f.endsWith('.json'));

const content: SearchContent = {
  materias: read('materias.json'),
  temarios: list('temarios').map((f) => read(`temarios/${f}`)),
  formulas: read('formulas.json'),
  glosario: read('glosario.json'),
  apps: read('apps.json'),
  ejercicios: read('ejercicios.json'),
  herramientas: TOOLS,
};

const docs = buildSearchDocuments(content);
const index = new MiniSearch(SEARCH_OPTIONS);
index.addAll(docs);

const outDir = join(root, 'src', 'generated');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'search-index.json'), JSON.stringify(index));

// Figures shown on the home page are computed from the content, never typed by hand.
const stats = {
  materias: content.materias.length,
  temas: content.temarios.reduce((n, t) => n + t.temas.length, 0),
  subtemas: content.temarios.reduce((n, t) => n + t.temas.reduce((m, tema) => m + tema.subtemas.length, 0), 0),
  formulas: content.formulas.filter((f) => f.estado !== 'pendiente').length,
  ejercicios: content.ejercicios.length,
  terminos: content.glosario.length,
  herramientas: TOOLS.length,
  fuentes: read<unknown[]>('fuentes.json').length,
  porMateria: Object.fromEntries(
    content.temarios.map((t) => [t.materia, { temas: t.temas.length, subtemas: t.temas.reduce((m, tema) => m + tema.subtemas.length, 0) }]),
  ),
};
writeFileSync(join(outDir, 'stats.json'), JSON.stringify(stats));
console.log(`Índice de búsqueda: ${docs.length} documentos · cifras: ${JSON.stringify(stats)}`);

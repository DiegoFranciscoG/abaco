/**
 * Builds the search index at compile time (MiniSearch) so the app does not index ~800 documents on the phone.
 * Run with `node scripts/build-search-index.ts` (Node ≥ 22.18 strips TypeScript types natively).
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import MiniSearch from 'minisearch';
import { buildSearchDocuments, SEARCH_OPTIONS, type SearchContent } from '../src/domain/search/index-data.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'content');
const read = <T>(file: string): T => JSON.parse(readFileSync(join(contentDir, file), 'utf8')) as T;
const list = (dir: string): string[] => readdirSync(join(contentDir, dir)).filter((f) => f.endsWith('.json'));

const content: SearchContent = {
  universidades: read('universidades.json'),
  carreras: read('carreras.json'),
  mallas: list('mallas').map((f) => read(`mallas/${f}`)),
  temarios: list('temarios').map((f) => read(`temarios/${f}`)),
  formulas: read('formulas.json'),
  glosario: read('glosario.json'),
  apps: read('apps.json'),
  ejercicios: read('ejercicios.json'),
};

const docs = buildSearchDocuments(content);
const index = new MiniSearch(SEARCH_OPTIONS);
index.addAll(docs);

const outDir = join(root, 'src', 'generated');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'search-index.json'), JSON.stringify(index));
console.log(`Índice de búsqueda: ${docs.length} documentos → src/generated/search-index.json`);

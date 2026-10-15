import MiniSearch, { type AsPlainObject } from 'minisearch';
import { SEARCH_OPTIONS, type SearchDoc, type SearchDocType } from './index-data';

export interface SearchHit {
  id: string;
  tipo: SearchDocType;
  titulo: string;
  ruta: string;
  extracto: string;
  area: string;
  score: number;
}

export type ContentIndex = MiniSearch<SearchDoc>;

let indexPromise: Promise<ContentIndex> | null = null;

/** Loads the index generated at build time (one lazy chunk). */
export function loadContentIndex(): Promise<ContentIndex> {
  indexPromise ??= import('../../generated/search-index.json').then((module) =>
    MiniSearch.loadJS<SearchDoc>(module.default as unknown as AsPlainObject, SEARCH_OPTIONS),
  );
  return indexPromise;
}

export function indexFromDocuments(docs: SearchDoc[]): ContentIndex {
  const index = new MiniSearch<SearchDoc>(SEARCH_OPTIONS);
  index.addAll(docs);
  return index;
}

export function searchContent(
  index: ContentIndex,
  query: string,
  options: { types?: SearchDocType[]; limit?: number } = {},
): SearchHit[] {
  const text = query.trim();
  if (text.length < 2) return [];
  const filter = options.types ? (r: { tipo: SearchDocType }) => options.types?.includes(r.tipo) ?? true : undefined;
  let results = index.search(text, filter ? { filter: filter as never } : {});
  // If every word is required and nothing matches, fall back to "any word".
  if (results.length === 0) results = index.search(text, { combineWith: 'OR', ...(filter ? { filter: filter as never } : {}) });
  return results.slice(0, options.limit ?? 30).map((r) => ({
    id: String(r.id),
    tipo: r.tipo as SearchDocType,
    titulo: r.titulo as string,
    ruta: r.ruta as string,
    extracto: r.extracto as string,
    area: r.area as string,
    score: r.score,
  }));
}

export function suggest(index: ContentIndex, query: string, limit = 6): string[] {
  const text = query.trim();
  if (text.length < 2) return [];
  return index
    .autoSuggest(text, { prefix: true, fuzzy: 0.2 })
    .slice(0, limit)
    .map((s) => s.suggestion);
}

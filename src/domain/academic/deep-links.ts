export interface DeepLink {
  id: string;
  label: string;
  description: string;
  url: string;
}

interface DeepLinkSource {
  id: string;
  label: string;
  description: string;
  build: (encodedQuery: string) => string;
}

/**
 * Sources without a usable public API (or whose terms forbid automated queries). The app never fetches them:
 * it only opens their own search page in a new tab with the query already written. URL formats checked on
 * 2026-10-14 (docs/apis.md).
 */
const SOURCES: readonly DeepLinkSource[] = [
  { id: 'scholar', label: 'Google Académico', description: 'Índice general; incluye tesis y libros', build: (q) => `https://scholar.google.com/scholar?hl=es&q=${q}` },
  { id: 'scielo', label: 'SciELO', description: 'Revistas latinoamericanas de acceso abierto', build: (q) => `https://search.scielo.org/?q=${q}&lang=es` },
  { id: 'redalyc', label: 'Redalyc', description: 'Revistas científicas de Iberoamérica', build: (q) => `https://www.redalyc.org/busquedaArticuloFiltros.oa?q=${q}` },
  { id: 'dialnet', label: 'Dialnet', description: 'Producción en español, fuerte en ciencias sociales', build: (q) => `https://dialnet.unirioja.es/buscar/documentos?querysDismax.DOCUMENTAL_TODO=${q}` },
  { id: 'base', label: 'BASE', description: 'Repositorios institucionales de todo el mundo', build: (q) => `https://www.base-search.net/Search/Results?lookfor=${q}` },
  { id: 'scribd', label: 'Scribd', description: 'Documentos subidos por usuarios: verifica autor y derechos', build: (q) => `https://www.scribd.com/search?query=${q}` },
  { id: 'arxiv', label: 'arXiv', description: 'Economía cuantitativa y finanzas matemáticas (preprints)', build: (q) => `https://arxiv.org/search/?query=${q}&searchtype=all` },
  { id: 'semanticscholar', label: 'Semantic Scholar', description: 'Índice académico con resúmenes', build: (q) => `https://www.semanticscholar.org/search?q=${q}` },
];

export function deepLinks(query: string): DeepLink[] {
  const q = encodeURIComponent(query.trim());
  return SOURCES.map(({ build, ...rest }) => ({ ...rest, url: build(q) }));
}

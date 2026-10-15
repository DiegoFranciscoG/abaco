import { normalizeText } from '../text/normalize';
import { ADAPTERS } from './sources';
import { DIRECT_SOURCES, type AcademicResult, type SourceId, type SourceStatus } from './types';

export const SEARCH_TIMEOUT_MS = 8000;
export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const RESULTS_PER_SOURCE = 10;
export const MAX_QUERY_LENGTH = 200;

export interface SearchCache {
  get(key: string): Promise<unknown | undefined>;
  set(key: string, value: unknown, ttlMs: number): Promise<void>;
}

export interface SearchOptions {
  fetchFn?: typeof fetch;
  cache?: SearchCache;
  timeoutMs?: number;
  signal?: AbortSignal;
  sources?: readonly SourceId[];
  isOnline?: () => boolean;
  /** Called as soon as each source answers, so the UI can show partial results. */
  onSource?: (source: SourceId, status: SourceStatus, results: AcademicResult[]) => void;
}

export interface SourceOutcome {
  status: SourceStatus;
  results: AcademicResult[];
  fromCache: boolean;
  quotaRemaining?: number;
}

export interface SearchResponse {
  query: string;
  results: AcademicResult[];
  bySource: Record<SourceId, SourceOutcome>;
}

export function cleanQuery(query: string): string {
  return query.replace(/\p{Cc}/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY_LENGTH);
}

export const cacheKey = (source: SourceId, query: string): string => `${source}:${normalizeText(query)}`;

class TimeoutError extends Error {}
class QuotaError extends Error {}

async function fetchJson(
  url: string,
  fetchFn: typeof fetch,
  timeoutMs: number,
  outer?: AbortSignal,
): Promise<{ json: unknown; headers: Headers }> {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  outer?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(new TimeoutError()), timeoutMs);
  try {
    // No credentials, no custom headers: a "simple" CORS request that carries nothing about the student.
    const response = await fetchFn(url, {
      signal: controller.signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      headers: { Accept: 'application/json' },
    });
    if (response.status === 429) throw new QuotaError('La fuente alcanzó su límite de consultas por hoy.');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { json: await response.json(), headers: response.headers };
  } catch (error) {
    if (controller.signal.aborted && controller.signal.reason instanceof TimeoutError) throw new TimeoutError();
    throw error;
  } finally {
    clearTimeout(timer);
    outer?.removeEventListener('abort', onAbort);
  }
}

/** Interleaves results from each source and removes duplicates by DOI (first occurrence wins). */
export function mergeResults(lists: AcademicResult[][]): AcademicResult[] {
  const seen = new Set<string>();
  const merged: AcademicResult[] = [];
  const longest = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < longest; i += 1) {
    for (const list of lists) {
      const item = list[i];
      if (!item) continue;
      const key = item.doi ? `doi:${item.doi}` : `${item.source}:${item.id}:${normalizeText(item.title)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }
  return merged;
}

async function searchSource(source: SourceId, query: string, options: SearchOptions): Promise<SourceOutcome> {
  const adapter = ADAPTERS[source];
  if (!adapter) return { status: { state: 'error', message: 'Fuente desconocida' }, results: [], fromCache: false };
  const key = cacheKey(source, query);
  const cached = (await options.cache?.get(key)) as { total: number; results: AcademicResult[] } | undefined;
  if (cached) return { status: { state: 'ok', total: cached.total }, results: cached.results, fromCache: true };
  if (options.isOnline && !options.isOnline()) {
    return { status: { state: 'offline' }, results: [], fromCache: false };
  }
  try {
    const { json, headers } = await fetchJson(
      adapter.buildUrl(query, RESULTS_PER_SOURCE),
      options.fetchFn ?? fetch,
      options.timeoutMs ?? SEARCH_TIMEOUT_MS,
      options.signal,
    );
    const parsed = adapter.parse(json);
    await options.cache?.set(key, parsed, CACHE_TTL_MS);
    const remaining = Number(headers.get('X-RateLimit-Remaining') ?? NaN);
    return {
      status: { state: 'ok', total: parsed.total },
      results: parsed.results,
      fromCache: false,
      ...(Number.isFinite(remaining) ? { quotaRemaining: remaining } : {}),
    };
  } catch (error) {
    if (error instanceof TimeoutError) return { status: { state: 'timeout' }, results: [], fromCache: false };
    if (error instanceof QuotaError) return { status: { state: 'quota', message: error.message }, results: [], fromCache: false };
    const message =
      error instanceof Error && error.name === 'ZodError'
        ? 'La fuente respondió en un formato inesperado.'
        : 'No se pudo consultar la fuente.';
    return { status: { state: 'error', message }, results: [], fromCache: false };
  }
}

/**
 * Queries every direct source in parallel. One failing, slow or offline source never blocks the others
 * (test T-09); each outcome is reported separately.
 */
export async function searchAcademic(rawQuery: string, options: SearchOptions = {}): Promise<SearchResponse> {
  const query = cleanQuery(rawQuery);
  const sources = options.sources ?? DIRECT_SOURCES;
  const bySource = {} as Record<SourceId, SourceOutcome>;
  if (query.length < 2) {
    for (const source of sources) bySource[source] = { status: { state: 'ok', total: 0 }, results: [], fromCache: false };
    return { query, results: [], bySource };
  }
  await Promise.all(
    sources.map(async (source) => {
      const outcome = await searchSource(source, query, options);
      bySource[source] = outcome;
      options.onSource?.(source, outcome.status, outcome.results);
    }),
  );
  return { query, results: mergeResults(sources.map((s) => bySource[s]?.results ?? [])), bySource };
}

export function describeStatus(status: SourceStatus): string {
  switch (status.state) {
    case 'ok':
      return `${status.total.toLocaleString('es-EC')} resultados`;
    case 'timeout':
      return 'Tardó demasiado; prueba de nuevo o usa los enlaces de abajo.';
    case 'quota':
      return status.message;
    case 'offline':
      return 'Sin conexión: solo se muestran búsquedas guardadas.';
    case 'error':
      return status.message;
  }
}

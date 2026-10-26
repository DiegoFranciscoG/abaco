import { describe, expect, it, vi } from 'vitest';
import { formatApa, formatAuthorList, initials, splitName } from '../../src/domain/academic/apa';
import {
  cacheKey,
  cleanQuery,
  describeStatus,
  mergeResults,
  searchAcademic,
  type SearchCache,
} from '../../src/domain/academic/client';
import { deepLinks } from '../../src/domain/academic/deep-links';
import {
  crossref,
  doaj,
  lareferencia,
  normalizeDoi,
  openalex,
  openlibrary,
  parseCrossrefWork,
  plainText,
  safeUrl,
} from '../../src/domain/academic/sources';
import type { AcademicResult } from '../../src/domain/academic/types';
import {
  crossrefFixture,
  doajFixture,
  laReferenciaFixture,
  openAlexFixture,
  openLibraryFixture,
} from '../fixtures/academic';

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

function fakeFetch(map: Record<string, () => Response | Promise<Response>>): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const host = new URL(url).host;
    const handler = map[host];
    if (!handler) throw new TypeError('Failed to fetch');
    return new Promise<Response>((resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      Promise.resolve(handler()).then(resolve, reject);
    });
  }) as unknown as typeof fetch;
}

const allOk = {
  'api.crossref.org': () => jsonResponse(crossrefFixture),
  'api.openalex.org': () => jsonResponse(openAlexFixture, { headers: { 'X-RateLimit-Remaining': '930' } }),
  'doaj.org': () => jsonResponse(doajFixture),
  'buscador.lareferencia.info': () => jsonResponse(laReferenciaFixture),
  'openlibrary.org': () => jsonResponse(openLibraryFixture),
};

function memoryCache(): SearchCache & { store: Map<string, unknown> } {
  const store = new Map<string, unknown>();
  return {
    store,
    get: async (key) => store.get(key),
    set: async (key, value) => {
      store.set(key, value);
    },
  };
}

describe('helpers', () => {
  it('turns markup into plain text and truncates', () => {
    expect(plainText('<jats:p>A &amp; B</jats:p>')).toBe('A & B');
    expect(plainText('x'.repeat(50), 10)).toBe(`${'x'.repeat(9)}…`);
    expect(plainText('   ')).toBeUndefined();
  });

  it('normalizes DOIs and rejects invalid ones', () => {
    expect(normalizeDoi('https://doi.org/10.1234/ABC')).toBe('10.1234/abc');
    expect(normalizeDoi('doi:10.5555/x.y')).toBe('10.5555/x.y');
    expect(normalizeDoi('no')).toBeUndefined();
  });

  it('only accepts http(s) links', () => {
    expect(safeUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeUrl('https://example.org/a')).toBe('https://example.org/a');
    expect(safeUrl('no es url')).toBeUndefined();
  });

  it('cleans queries and builds cache keys without accents', () => {
    expect(cleanQuery('  costos\n de   producción ')).toBe('costos de producción');
    expect(cleanQuery('a'.repeat(300))).toHaveLength(200);
    expect(cacheKey('crossref', 'Producción')).toBe('crossref:produccion');
  });
});

describe('source adapters', () => {
  it('Crossref: keeps valid items and builds the request with selected fields only', () => {
    const { total, results } = crossref.parse(crossrefFixture);
    expect(total).toBe(2);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      title: 'Costos indirectos de fabricación en pymes',
      year: 2024,
      doi: '10.1234/abaco.2024.001',
    });
    expect(results[0]).not.toHaveProperty('abstract');
    expect(crossref.buildUrl('van tir', 10)).toContain('query=van%20tir');
    // Abstracts may be copyrighted by publishers: they are never requested.
    expect(crossref.buildUrl('x', 10)).not.toContain('abstract');
    expect(crossref.buildUrl('x', 10)).not.toContain('mailto');
  });

  it('OpenAlex: bibliographic data only, drops unsafe links and untitled works', () => {
    const { results } = openalex.parse(openAlexFixture);
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ pages: '45-60', openAccess: true });
    expect(results[0]).not.toHaveProperty('abstract');
    expect(openalex.buildUrl('x', 5)).not.toContain('abstract');
    expect(results[1]?.url).toBe('https://openalex.org/W2');
  });

  it('DOAJ and LA Referencia', () => {
    expect(doaj.parse(doajFixture).results[0]).toMatchObject({
      url: 'https://revista.example.org/articulo/1',
      openAccess: true,
      pages: '10-22',
    });
    const lr = lareferencia.parse(laReferenciaFixture).results[0];
    expect(lr).toMatchObject({ year: 2022, authors: [{ family: 'Ríos Vega', given: 'Daniela' }] });
    expect(lareferencia.buildUrl('niif', 5)).toContain('field%5B%5D=primaryAuthors');
  });

  it('Open Library: books with publisher and a canonical link; unexpected keys are dropped', () => {
    const { results, total } = openlibrary.parse(openLibraryFixture);
    expect(total).toBe(3);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      type: 'book',
      publisher: 'Editorial Ejemplo',
      url: 'https://openlibrary.org/works/OL123W',
      year: 2019,
      language: 'es',
    });
    expect(openlibrary.buildUrl('costos', 10)).toContain('fields=key,title');
  });

  it('Crossref work by DOI for the APA tool', () => {
    const work = parseCrossrefWork({ message: crossrefFixture.message.items[0] });
    expect(work).toMatchObject({
      doi: '10.1234/abaco.2024.001',
      url: 'https://doi.org/10.1234/abaco.2024.001',
    });
  });

  it('rejects answers with an unexpected shape', () => {
    expect(() => crossref.parse({ nada: true })).toThrow();
  });
});

describe('APA 7 citations', () => {
  it('splits Hispanic names with two surnames', () => {
    expect(splitName('Ana María Quito Pérez', 'es')).toEqual({ given: 'Ana María', family: 'Quito Pérez' });
    expect(splitName('Carla Torres Mena', 'es')).toEqual({ given: 'Carla', family: 'Torres Mena' });
    expect(splitName('John Michael Smith', 'en')).toEqual({ given: 'John Michael', family: 'Smith' });
    expect(splitName('Ríos Vega, Daniela')).toEqual({ given: 'Daniela', family: 'Ríos Vega' });
    expect(splitName('Pedro de la Cruz', 'en')).toEqual({ given: 'Pedro', family: 'de la Cruz' });
    expect(initials('María-José Luisa')).toBe('M.-J. L.');
  });

  it('lists authors with & and abbreviates beyond 20', () => {
    expect(
      formatAuthorList([
        { given: 'Ana', family: 'Quito' },
        { given: 'Luis', family: 'Andrade' },
      ]),
    ).toBe('Quito, A., & Andrade, L.');
    const many = Array.from({ length: 22 }, (_, i) => ({ given: 'X', family: `A${i}` }));
    const list = formatAuthorList(many);
    expect(list).toContain('A18, X., … A21, X.');
    expect(list).not.toContain('A19,');
  });

  it('formats a journal article with DOI', () => {
    const [result] = crossref.parse(crossrefFixture).results;
    const citation = formatApa(result!);
    expect(citation.text).toBe(
      'Quito Pérez, A. M., & Andrade, L. (2024). Costos indirectos de fabricación en pymes. Revista de Contabilidad Aplicada, 12(2), 45-60. https://doi.org/10.1234/abaco.2024.001',
    );
    expect(citation.parts.italic).toBe('Revista de Contabilidad Aplicada, 12');
  });

  it('uses (s. f.) without year and works without authors or journal', () => {
    const citation = formatApa({
      id: 'x',
      source: 'doaj',
      title: '¿Qué es el VAN?',
      authors: [],
      url: 'https://example.org',
    });
    expect(citation.text).toBe('¿Qué es el VAN? (s. f.). https://example.org');
  });
});

describe('searchAcademic (parallel, cached, fault tolerant)', () => {
  it('merges all sources and removes the duplicate DOI', async () => {
    const response = await searchAcademic('costos', { fetchFn: fakeFetch(allOk) });
    const dois = response.results.filter((r) => r.doi === '10.1234/abaco.2024.001');
    expect(dois).toHaveLength(1);
    // 4 articles (one duplicate DOI removed) + 1 book from Open Library.
    expect(response.results).toHaveLength(5);
    expect(response.results.some((r) => r.type === 'book')).toBe(true);
    expect(response.bySource.openalex.quotaRemaining).toBe(930);
  });

  it('caches answers and does not call the network the second time', async () => {
    const fetchFn = fakeFetch(allOk);
    const cache = memoryCache();
    await searchAcademic('VAN', { fetchFn, cache });
    const calls = (fetchFn as unknown as { mock: { calls: unknown[] } }).mock.calls.length;
    const again = await searchAcademic('van', { fetchFn, cache });
    expect((fetchFn as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(calls);
    expect(again.bySource.crossref.fromCache).toBe(true);
  });

  it('ignores too-short queries', async () => {
    const fetchFn = fakeFetch(allOk);
    const response = await searchAcademic(' a ', { fetchFn });
    expect(response.results).toHaveLength(0);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  /** T-09: a source that is down, slow or over quota never blocks the others. */
  it('T-09: one source down, one slow, one over quota → the rest still answer', async () => {
    const onSource = vi.fn();
    const response = await searchAcademic('costos', {
      timeoutMs: 50,
      onSource,
      fetchFn: fakeFetch({
        'api.crossref.org': () => jsonResponse(crossrefFixture),
        'api.openalex.org': () => new Promise<Response>(() => undefined),
        'doaj.org': () => new Response('{}', { status: 429 }),
        // lareferencia and openlibrary missing → network error
      }),
    });
    expect(response.bySource.crossref.status.state).toBe('ok');
    expect(response.bySource.openalex.status.state).toBe('timeout');
    expect(response.bySource.doaj.status.state).toBe('quota');
    expect(response.bySource.lareferencia.status.state).toBe('error');
    expect(response.bySource.openlibrary.status.state).toBe('error');
    expect(response.results.length).toBeGreaterThan(0);
    expect(onSource).toHaveBeenCalledTimes(5);
  });

  it('reports bad answers (HTTP 500 or wrong shape) as errors', async () => {
    const response = await searchAcademic('costos', {
      fetchFn: fakeFetch({
        'api.crossref.org': () => new Response('x', { status: 500 }),
        'api.openalex.org': () => jsonResponse({ forma: 'rara' }),
        'doaj.org': () => jsonResponse(doajFixture),
        'buscador.lareferencia.info': () => jsonResponse(laReferenciaFixture),
      }),
    });
    expect(response.bySource.crossref.status.state).toBe('error');
    expect(response.bySource.openalex.status).toEqual({
      state: 'error',
      message: 'La fuente respondió en un formato inesperado.',
    });
  });

  it('T-08: offline → no request is attempted and the UI is told why', async () => {
    const fetchFn = fakeFetch(allOk);
    const response = await searchAcademic('costos', { fetchFn, isOnline: () => false });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(Object.values(response.bySource).every((o) => o.status.state === 'offline')).toBe(true);
    expect(describeStatus({ state: 'offline' })).toMatch(/Sin conexión/);
  });

  it('the request carries no credentials and no referrer', async () => {
    const fetchFn = fakeFetch(allOk);
    await searchAcademic('costos', { fetchFn, sources: ['crossref'] });
    const init = (fetchFn as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0]?.[1];
    expect(init).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer' });
  });

  it('describes every status', () => {
    expect(describeStatus({ state: 'ok', total: 1234 })).toMatch(/1.234|1,234/);
    expect(describeStatus({ state: 'timeout' })).toMatch(/Tardó/);
    expect(describeStatus({ state: 'quota', message: 'cupo' })).toBe('cupo');
    expect(describeStatus({ state: 'error', message: 'x' })).toBe('x');
  });
});

describe('merge and deep links', () => {
  it('interleaves sources', () => {
    const a = { id: '1', source: 'crossref', title: 'A', authors: [], url: 'https://a' } as AcademicResult;
    const b = { id: '2', source: 'doaj', title: 'B', authors: [], url: 'https://b' } as AcademicResult;
    const c = { id: '3', source: 'crossref', title: 'C', authors: [], url: 'https://c' } as AcademicResult;
    expect(mergeResults([[a, c], [b]]).map((r) => r.title)).toEqual(['A', 'B', 'C']);
  });

  it('builds deep links with the query encoded, including Google Scholar and Scribd', () => {
    const links = deepLinks('punto de equilibrio & costos');
    expect(links.map((l) => l.id)).toEqual(
      expect.arrayContaining(['scholar', 'scribd', 'redalyc', 'dialnet', 'scielo']),
    );
    for (const link of links) {
      expect(link.url).toMatch(/^https:\/\//);
      expect(link.url).toContain('punto%20de%20equilibrio%20%26%20costos');
    }
  });
});

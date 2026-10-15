import { z } from 'zod';
import type { AcademicResult, Author, SourceAdapter } from './types';

const MAX_ABSTRACT = 1200;

/** Removes markup (Crossref abstracts use JATS XML) and collapses spaces. Output is plain text, never HTML. */
export function plainText(value: string | undefined | null, max = MAX_ABSTRACT): string | undefined {
  if (!value) return undefined;
  const text = value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return undefined;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export function normalizeDoi(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const doi = value.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:/i, '');
  return /^10\.\d{4,9}\/\S+$/.test(doi) ? doi.toLowerCase() : undefined;
}

/** Only http(s) links are shown; anything else (javascript:, data:) is dropped. */
export function safeUrl(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** Rebuilds an OpenAlex abstract from its inverted index ({ word: [positions] }). */
export function rebuildAbstract(index: Record<string, number[]> | null | undefined): string | undefined {
  if (!index) return undefined;
  const words: string[] = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const position of positions) {
      if (Number.isInteger(position) && position >= 0 && position < 5000) words[position] = word;
    }
  }
  return plainText(words.filter(Boolean).join(' '));
}

const year = (value: unknown): number | undefined => {
  const n = typeof value === 'string' ? Number.parseInt(value, 10) : typeof value === 'number' ? value : NaN;
  return Number.isInteger(n) && n > 1500 && n < 2200 ? n : undefined;
};

// ---------------------------------------------------------------- Crossref

const crossrefSchema = z.object({
  message: z.object({
    'total-results': z.number().default(0),
    items: z
      .array(
        z.object({
          DOI: z.string(),
          title: z.array(z.string()).optional(),
          author: z
            .array(z.object({ given: z.string().optional(), family: z.string().optional(), name: z.string().optional() }))
            .optional(),
          issued: z.object({ 'date-parts': z.array(z.array(z.number().nullable())).optional() }).optional(),
          'container-title': z.array(z.string()).optional(),
          volume: z.string().optional(),
          issue: z.string().optional(),
          page: z.string().optional(),
          type: z.string().optional(),
          URL: z.string().optional(),
          abstract: z.string().optional(),
          language: z.string().optional(),
        }),
      )
      .default([]),
  }),
});

export const crossref: SourceAdapter = {
  id: 'crossref',
  buildUrl: (query, limit) =>
    `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${limit}` +
    '&select=DOI,title,author,issued,container-title,volume,issue,page,type,URL,abstract',
  parse(json) {
    const data = crossrefSchema.parse(json).message;
    const results: AcademicResult[] = [];
    for (const item of data.items) {
      const title = plainText(item.title?.[0], 400);
      const doi = normalizeDoi(item.DOI);
      if (!title || !doi) continue;
      results.push({
        id: `crossref:${doi}`,
        source: 'crossref',
        title,
        authors: (item.author ?? []).map((a): Author =>
          a.family ? { given: a.given, family: a.family } : { full: a.name ?? a.given ?? '' },
        ),
        year: year(item.issued?.['date-parts']?.[0]?.[0] ?? undefined),
        container: plainText(item['container-title']?.[0], 300),
        volume: item.volume,
        issue: item.issue,
        pages: item.page,
        abstract: plainText(item.abstract),
        doi,
        url: `https://doi.org/${doi}`,
        type: item.type,
        language: item.language,
      });
    }
    return { total: data['total-results'], results };
  },
};

// ---------------------------------------------------------------- OpenAlex

const openAlexSchema = z.object({
  meta: z.object({ count: z.number().default(0) }),
  results: z
    .array(
      z.object({
        id: z.string(),
        doi: z.string().nullable().optional(),
        title: z.string().nullable().optional(),
        publication_year: z.number().nullable().optional(),
        language: z.string().nullable().optional(),
        type: z.string().nullable().optional(),
        authorships: z
          .array(z.object({ author: z.object({ display_name: z.string().nullable().optional() }) }))
          .optional(),
        primary_location: z
          .object({
            landing_page_url: z.string().nullable().optional(),
            source: z.object({ display_name: z.string().nullable().optional() }).nullable().optional(),
          })
          .nullable()
          .optional(),
        open_access: z.object({ is_oa: z.boolean().optional(), oa_url: z.string().nullable().optional() }).optional(),
        abstract_inverted_index: z.record(z.string(), z.array(z.number())).nullable().optional(),
        biblio: z
          .object({
            volume: z.string().nullable().optional(),
            issue: z.string().nullable().optional(),
            first_page: z.string().nullable().optional(),
            last_page: z.string().nullable().optional(),
          })
          .optional(),
      }),
    )
    .default([]),
});

export const openalex: SourceAdapter = {
  id: 'openalex',
  buildUrl: (query, limit) =>
    `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${limit}` +
    '&select=id,doi,title,publication_year,language,type,authorships,primary_location,open_access,abstract_inverted_index,biblio',
  parse(json) {
    const data = openAlexSchema.parse(json);
    const results: AcademicResult[] = [];
    for (const item of data.results) {
      const title = plainText(item.title, 400);
      if (!title) continue;
      const doi = normalizeDoi(item.doi);
      const url = doi
        ? `https://doi.org/${doi}`
        : (safeUrl(item.primary_location?.landing_page_url) ?? safeUrl(item.id) ?? 'https://openalex.org');
      const first = item.biblio?.first_page;
      const last = item.biblio?.last_page;
      results.push({
        id: doi ? `doi:${doi}` : `openalex:${item.id}`,
        source: 'openalex',
        title,
        authors: (item.authorships ?? [])
          .map((a) => a.author.display_name ?? '')
          .filter(Boolean)
          .map((full) => ({ full })),
        year: year(item.publication_year ?? undefined),
        container: plainText(item.primary_location?.source?.display_name, 300),
        volume: item.biblio?.volume ?? undefined,
        issue: item.biblio?.issue ?? undefined,
        pages: first ? (last && last !== first ? `${first}-${last}` : first) : undefined,
        abstract: rebuildAbstract(item.abstract_inverted_index),
        doi,
        url,
        openAccess: item.open_access?.is_oa,
        type: item.type ?? undefined,
        language: item.language ?? undefined,
      });
    }
    return { total: data.meta.count, results };
  },
};

// ---------------------------------------------------------------- DOAJ

const doajSchema = z.object({
  total: z.number().default(0),
  results: z
    .array(
      z.object({
        id: z.string(),
        bibjson: z.object({
          title: z.string().optional(),
          year: z.string().optional(),
          abstract: z.string().optional(),
          author: z.array(z.object({ name: z.string().optional() })).optional(),
          identifier: z.array(z.object({ id: z.string().optional(), type: z.string().optional() })).optional(),
          journal: z
            .object({
              title: z.string().optional(),
              volume: z.string().optional(),
              number: z.string().optional(),
              language: z.array(z.string()).optional(),
            })
            .optional(),
          link: z.array(z.object({ url: z.string().optional(), type: z.string().optional() })).optional(),
          start_page: z.string().optional(),
          end_page: z.string().optional(),
        }),
      }),
    )
    .default([]),
});

export const doaj: SourceAdapter = {
  id: 'doaj',
  buildUrl: (query, limit) => `https://doaj.org/api/search/articles/${encodeURIComponent(query)}?pageSize=${limit}`,
  parse(json) {
    const data = doajSchema.parse(json);
    const results: AcademicResult[] = [];
    for (const item of data.results) {
      const b = item.bibjson;
      const title = plainText(b.title, 400);
      if (!title) continue;
      const doi = normalizeDoi(b.identifier?.find((i) => i.type?.toLowerCase() === 'doi')?.id);
      const fulltext = safeUrl(b.link?.find((l) => l.type === 'fulltext')?.url ?? b.link?.[0]?.url);
      results.push({
        id: doi ? `doi:${doi}` : `doaj:${item.id}`,
        source: 'doaj',
        title,
        authors: (b.author ?? []).map((a) => ({ full: a.name ?? '' })).filter((a) => a.full),
        year: year(b.year),
        container: plainText(b.journal?.title, 300),
        volume: b.journal?.volume,
        issue: b.journal?.number,
        pages: b.start_page ? (b.end_page ? `${b.start_page}-${b.end_page}` : b.start_page) : undefined,
        abstract: plainText(b.abstract),
        doi,
        url: doi ? `https://doi.org/${doi}` : (fulltext ?? `https://doaj.org/article/${encodeURIComponent(item.id)}`),
        openAccess: true,
        type: 'journal-article',
        language: b.journal?.language?.[0]?.toLowerCase(),
      });
    }
    return { total: data.total, results };
  },
};

// ---------------------------------------------------------------- LA Referencia (VuFind)

const laReferenciaSchema = z.object({
  resultCount: z.number().default(0),
  records: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        primaryAuthors: z.array(z.string()).optional(),
        publicationDates: z.array(z.string()).optional(),
        urls: z.array(z.object({ url: z.string().optional() })).optional(),
        formats: z.array(z.string()).optional(),
        summary: z.array(z.string()).optional(),
        languages: z.array(z.string()).optional(),
      }),
    )
    .default([]),
});

const LR_FIELDS = ['id', 'title', 'primaryAuthors', 'publicationDates', 'urls', 'formats', 'summary', 'languages'];

export const lareferencia: SourceAdapter = {
  id: 'lareferencia',
  buildUrl: (query, limit) =>
    `https://buscador.lareferencia.info/api/v1/search?lookfor=${encodeURIComponent(query)}&type=AllFields&limit=${limit}` +
    LR_FIELDS.map((f) => `&field%5B%5D=${f}`).join(''),
  parse(json) {
    const data = laReferenciaSchema.parse(json);
    const results: AcademicResult[] = [];
    for (const item of data.records) {
      const title = plainText(item.title, 400);
      if (!title) continue;
      const url =
        item.urls?.map((u) => safeUrl(u.url)).find(Boolean) ??
        `https://www.lareferencia.info/vufind/Record/${encodeURIComponent(item.id)}`;
      const doi = normalizeDoi(url.includes('doi.org') ? url : undefined);
      results.push({
        id: doi ? `doi:${doi}` : `lareferencia:${item.id}`,
        source: 'lareferencia',
        title,
        // VuFind gives "Family, Given" names.
        authors: (item.primaryAuthors ?? []).map((name) => {
          const [family, given] = name.split(',').map((p) => p.trim());
          return given ? { family, given } : { full: name };
        }),
        year: year(item.publicationDates?.[0]),
        abstract: plainText(item.summary?.[0]),
        doi,
        url,
        type: item.formats?.[0],
        language: item.languages?.[0],
      });
    }
    return { total: data.resultCount, results };
  },
};

export const ADAPTERS: Record<string, SourceAdapter> = { crossref, openalex, doaj, lareferencia };

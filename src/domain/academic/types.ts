export const DIRECT_SOURCES = ['crossref', 'openalex', 'doaj', 'lareferencia', 'openlibrary'] as const;
export type SourceId = (typeof DIRECT_SOURCES)[number];

export const SOURCE_LABELS: Record<SourceId, string> = {
  crossref: 'Crossref',
  openalex: 'OpenAlex',
  doaj: 'DOAJ',
  lareferencia: 'LA Referencia',
  openlibrary: 'Open Library',
};

export interface Author {
  given?: string;
  family?: string;
  /** Full name when the source does not split it. */
  full?: string;
}

export interface AcademicResult {
  id: string;
  source: SourceId;
  title: string;
  authors: Author[];
  year?: number;
  container?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  /** Books only: publisher shown in the APA reference. */
  publisher?: string;
  doi?: string;
  url: string;
  openAccess?: boolean;
  type?: string;
  language?: string;
}

export type SourceStatus =
  | { state: 'ok'; total: number }
  | { state: 'error'; message: string }
  | { state: 'timeout' }
  | { state: 'quota'; message: string }
  | { state: 'offline' };

export interface SourceAdapter {
  id: SourceId;
  buildUrl(query: string, limit: number): string;
  parse(json: unknown): { total: number; results: AcademicResult[] };
}

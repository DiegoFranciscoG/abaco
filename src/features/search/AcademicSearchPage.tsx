import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { clearSearches, getCached, listSearches, recordSearch, setCached } from '../../data/repositories';
import { formatApa } from '../../domain/academic/apa';
import { describeStatus, searchAcademic, type SearchResponse } from '../../domain/academic/client';
import { deepLinks } from '../../domain/academic/deep-links';
import { DIRECT_SOURCES, SOURCE_LABELS, type AcademicResult, type SourceId } from '../../domain/academic/types';
import { useDocumentTitle, useOnline } from '../../ui/hooks';
import { Icon } from '../../ui/icons';
import { CopyButton, EmptyState, Notice, PageHeader } from '../../ui/primitives';
import { StarButton } from '../../ui/StarButton';
import { AddToCollectionButton } from '../me/AddToCollection';

const cache = {
  get: (key: string) => getCached(key),
  set: (key: string, value: unknown, ttl: number) => setCached(key, value, ttl),
};

function ResultCard({ result }: { result: AcademicResult }) {
  const citation = formatApa(result);
  const snapshot = {
    titulo: result.title,
    autores: result.authors.map((a) => a.full ?? [a.given, a.family].filter(Boolean).join(' ')),
    ...(result.year ? { anio: result.year } : {}),
    ...(result.container ? { revista: result.container } : {}),
    ...(result.doi ? { doi: result.doi } : {}),
    url: result.url,
    fuente: SOURCE_LABELS[result.source],
    cita: citation.text,
  };
  const authors = snapshot.autores.slice(0, 4).join(', ') + (snapshot.autores.length > 4 ? ' et al.' : '');
  return (
    <article className="card p-5">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-surface-2 px-2 py-0.5 font-semibold text-muted">{SOURCE_LABELS[result.source]}</span>
        {result.year ? <span className="tnum font-semibold text-ink-2">{result.year}</span> : null}
        {result.openAccess ? <span className="rounded-full bg-ok-soft px-2 py-0.5 font-semibold text-ok">Acceso abierto</span> : null}
        {result.type ? <span className="text-muted">{result.type}</span> : null}
      </div>
      <h3 className="text-[1.05rem] leading-snug font-semibold">
        <a href={result.url} target="_blank" rel="noopener noreferrer" className="hover:text-red hover:underline">
          {result.title}
        </a>
      </h3>
      {authors ? <p className="mt-1 text-sm text-ink-2">{authors}</p> : null}
      {result.container ? <p className="text-sm text-muted italic">{result.container}</p> : null}
      {result.abstract ? <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-muted">{result.abstract}</p> : null}
      <div className="mt-4 rounded-xl bg-surface-2 p-3 text-sm leading-relaxed">
        <span className="mb-1 block text-xs font-bold tracking-[0.1em] text-red uppercase">Cita APA 7</span>
        {citation.parts.before}
        {citation.parts.italic ? <em>{citation.parts.italic}</em> : null}
        {citation.parts.after}
        <span className="mt-1 block text-[0.7rem] text-muted">Generada automáticamente: revisa nombres y mayúsculas antes de entregar.</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <CopyButton text={citation.text} label="Copiar cita" />
        <StarButton compact star={{ tipo: 'articulo', refId: result.id, titulo: result.title, snapshot }} />
        <AddToCollectionButton compact item={{ tipo: 'articulo', refId: result.id, titulo: result.title, snapshot }} />
        <a href={result.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
          <Icon name="external" size={18} /> Abrir
        </a>
      </div>
    </article>
  );
}

export default function AcademicSearchPage() {
  useDocumentTitle('Buscador académico');
  const online = useOnline();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<SourceId | 'todas'>('todas');
  const controller = useRef<AbortController | null>(null);
  const history = useLiveQuery(() => listSearches(), []);

  const run = async (text: string) => {
    const q = text.trim();
    if (q.length < 2) return;
    controller.current?.abort();
    controller.current = new AbortController();
    setLoading(true);
    setParams({ q }, { replace: true });
    try {
      const result = await searchAcademic(q, { cache, signal: controller.current.signal, isOnline: () => navigator.onLine });
      setResponse(result);
      if (result.results.length > 0) await recordSearch(q, result.results.length);
    } finally {
      setLoading(false);
    }
  };

  const visible = response ? (source === 'todas' ? response.results : response.results.filter((r) => r.source === source)) : [];
  const links = deepLinks(response?.query ?? query);

  return (
    <div>
      <PageHeader
        eyebrow="Buscador académico"
        title="Artículos y tesis, con la cita lista"
        subtitle="Consulta en paralelo Crossref, OpenAlex, DOAJ y LA Referencia. Solo se envía el texto que buscas; tus apuntes nunca salen del teléfono."
      />
      <form
        className="mb-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void run(query);
        }}
        role="search"
      >
        <div className="relative flex-1">
          <Icon name="search" className="absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
          <input type="search" className="field h-14 pl-12 text-lg" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ej.: control interno cooperativas, NIIF pymes Ecuador" aria-label="Tema a buscar" maxLength={200} />
        </div>
        <button type="submit" className="btn btn-primary h-14 px-6" disabled={loading || query.trim().length < 2}>
          {loading ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {!online ? (
        <div className="mb-6">
          <Notice tone="warn" icon="wifi-off">
            Estás sin conexión. Puedes ver búsquedas guardadas en caché; para resultados nuevos necesitas internet.
          </Notice>
        </div>
      ) : null}

      {response ? (
        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filtrar por fuente">
          <button type="button" className="chip" aria-pressed={source === 'todas'} onClick={() => setSource('todas')}>
            Todas <span className="tnum opacity-70">{response.results.length}</span>
          </button>
          {DIRECT_SOURCES.map((s) => {
            const outcome = response.bySource[s];
            const ok = outcome?.status.state === 'ok';
            return (
              <button key={s} type="button" className="chip" aria-pressed={source === s} onClick={() => setSource(s)} title={outcome ? describeStatus(outcome.status) : ''}>
                <span className={`h-2 w-2 rounded-full ${ok ? 'bg-ok' : 'bg-warn'}`} aria-hidden="true" />
                {SOURCE_LABELS[s]}
                <span className="tnum opacity-70">{ok ? outcome.results.length : '—'}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {response ? (
        <ul className="mb-4 space-y-1 text-xs text-muted" aria-label="Estado de cada fuente">
          {DIRECT_SOURCES.filter((s) => response.bySource[s]?.status.state !== 'ok').map((s) => (
            <li key={s}>
              <strong className="text-ink-2">{SOURCE_LABELS[s]}:</strong> {describeStatus(response.bySource[s]!.status)}
            </li>
          ))}
          {response.bySource.openalex?.quotaRemaining !== undefined && response.bySource.openalex.quotaRemaining < 200 ? (
            <li>OpenAlex: quedan {response.bySource.openalex.quotaRemaining} créditos hoy para esta red.</li>
          ) : null}
        </ul>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-3">
          {response && visible.length === 0 && !loading ? (
            <EmptyState icon="search" title="Sin resultados en estas fuentes">
              Prueba con otras palabras o usa los enlaces de la derecha.
            </EmptyState>
          ) : null}
          {!response && !loading ? (
            <EmptyState icon="book" title="Busca un tema de tu asignatura">
              Los resultados traen autor, año, revista, resumen y acceso abierto cuando existe.
            </EmptyState>
          ) : null}
          {visible.map((r) => (
            <ResultCard key={`${r.source}:${r.id}`} result={r} />
          ))}
        </div>
        <aside className="space-y-6">
          <section aria-labelledby="tambien">
            <h2 id="tambien" className="mb-2 font-semibold">
              Buscar también en
            </h2>
            <p className="mb-3 text-xs text-muted">Se abren en una pestaña nueva con tu búsqueda escrita. ÁBACO no consulta estos sitios.</p>
            <ul className="space-y-2">
              {links.map((l) => (
                <li key={l.id}>
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className={`card card-lift flex items-center gap-3 p-3 ${query.trim().length < 2 ? 'pointer-events-none opacity-50' : ''}`} aria-disabled={query.trim().length < 2}>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{l.label}</span>
                      <span className="block truncate text-xs text-muted">{l.description}</span>
                    </span>
                    <Icon name="external" size={16} className="text-muted" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
          {history && history.length > 0 ? (
            <section aria-labelledby="recientes">
              <div className="mb-2 flex items-center justify-between">
                <h2 id="recientes" className="font-semibold">
                  Búsquedas recientes
                </h2>
                <button type="button" className="text-xs font-semibold text-muted hover:text-red" onClick={() => void clearSearches()}>
                  Borrar
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {history.slice(0, 10).map((h) => (
                  <button key={h.id} type="button" className="chip" onClick={() => { setQuery(h.consulta); void run(h.consulta); }}>
                    {h.consulta}
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

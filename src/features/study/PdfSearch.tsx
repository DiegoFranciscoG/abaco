import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useId, useRef, useState } from 'react';
import { getMateria } from '../../data/content';
import { listPdfs } from '../../data/study-repositories';
import { readerWindow, searchPdfs, SEARCH_LIMITS, type PdfHit } from '../../domain/study/pdf-search';
import { Icon } from '../../ui/icons';

/** The page (or a wide window) around a hit, with the match marked and scrolled into view. */
function Reader({ hit, texto, onClose }: { hit: PdfHit; texto: string; onClose: () => void }) {
  const markRef = useRef<HTMLElement>(null);
  useEffect(() => {
    markRef.current?.scrollIntoView?.({ block: 'center' });
  }, [hit]);
  const { desde, hasta } = readerWindow(texto, hit);
  return (
    <div className="card space-y-3 p-5" role="region" aria-label={`Texto de «${hit.nombre}»`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">
          {hit.nombre}
          {hit.pagina !== null ? (
            <span className="font-normal text-muted"> · página {hit.pagina}</span>
          ) : null}
        </p>
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          <Icon name="close" size={16} /> Cerrar
        </button>
      </div>
      <div className="max-h-96 overflow-y-auto rounded-xl bg-surface-2 p-4 text-sm leading-relaxed whitespace-pre-wrap text-ink-2">
        {desde > 0 && hit.pagina === null ? '… ' : null}
        {texto.slice(desde, hit.inicio)}
        <mark ref={markRef} className="rounded bg-red-soft px-0.5 text-ink">
          {texto.slice(hit.inicio, hit.fin)}
        </mark>
        {texto.slice(hit.fin, hasta)}
        {hasta < texto.length && hit.pagina === null ? ' …' : null}
      </div>
    </div>
  );
}

/** Search across every PDF saved on this device, whatever its subject. */
export function PdfSearch() {
  const id = useId();
  const pdfs = useLiveQuery(() => listPdfs(), [], []);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<PdfHit | null>(null);
  const hits = searchPdfs(pdfs, query);
  const searching = query.trim().length >= SEARCH_LIMITS.minQuery;
  if (pdfs.length === 0) return null;
  const openPdf = open ? pdfs.find((p) => p.id === open.pdfId) : undefined;

  return (
    <section aria-labelledby={`${id}-t`} className="card space-y-3 p-5">
      <h3 id={`${id}-t`} className="font-display text-lg font-semibold">
        Buscar en todos mis PDF
      </h3>
      <label className="block" htmlFor={`${id}-q`}>
        <span className="sr-only">Palabra o frase que buscas</span>
        <input
          id={`${id}-q`}
          type="search"
          className="field"
          value={query}
          maxLength={120}
          placeholder="Por ejemplo: depreciación, punto de equilibrio…"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(null);
          }}
        />
      </label>
      <p className="text-xs text-muted" aria-live="polite">
        {searching
          ? hits.length === 0
            ? `No aparece en tus ${pdfs.length} PDF.`
            : `${hits.length >= SEARCH_LIMITS.total ? `Las primeras ${hits.length}` : hits.length} coincidencias en tus PDF. Toca una para leerla en su contexto.`
          : `Busca en los ${pdfs.length} PDF guardados en este dispositivo; no importan las tildes ni las mayúsculas.`}
      </p>
      {searching && hits.length > 0 ? (
        <ul className="space-y-2">
          {hits.map((h) => (
            <li key={`${h.pdfId}-${h.inicio}`}>
              <button
                type="button"
                className="w-full rounded-xl border border-line p-3 text-left text-sm hover:border-red"
                onClick={() => setOpen(h)}
              >
                <span className="block text-xs font-semibold text-muted">
                  {h.nombre}
                  {h.pagina !== null ? ` · página ${h.pagina}` : ''} ·{' '}
                  {getMateria(h.materiaId)?.nombre ?? h.materiaId}
                </span>
                <span className="text-ink-2">
                  {h.antes}
                  <mark className="rounded bg-red-soft px-0.5 text-ink">{h.coincidencia}</mark>
                  {h.despues}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {open && openPdf ? <Reader hit={open} texto={openPdf.texto} onClose={() => setOpen(null)} /> : null}
    </section>
  );
}

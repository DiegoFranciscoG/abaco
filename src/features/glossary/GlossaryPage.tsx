import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { loadGlosario } from '../../data/content';
import { normalizeText } from '../../domain/text/normalize';
import { useAsync, useDocumentTitle } from '../../ui/hooks';
import { AreaBadge, PageHeader, Skeleton, SourceNote } from '../../ui/primitives';

export default function GlossaryPage() {
  useDocumentTitle('Glosario');
  const [params] = useSearchParams();
  const focus = params.get('t');
  const terms = useAsync(loadGlosario, []);
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    if (terms.status !== 'ready') return [];
    const q = normalizeText(query);
    return [...terms.data]
      .filter((t) => !q || normalizeText(`${t.termino} ${t.definicion} ${t.sinonimos.join(' ')} ${t.equivalente_ingles}`).includes(q))
      .sort((a, b) => a.termino.localeCompare(b.termino, 'es'));
  }, [terms, query]);

  useEffect(() => {
    if (focus && terms.status === 'ready') document.getElementById(`t-${focus}`)?.scrollIntoView({ block: 'center' });
  }, [focus, terms.status]);

  return (
    <div>
      <PageHeader eyebrow="Glosario" title="Palabras que vas a escuchar en clase" subtitle="Definiciones en redacción propia, con su equivalente en inglés y la fuente de cada una." />
      <input type="search" className="field mb-6 h-12" placeholder="Buscar término, sinónimo o palabra en inglés…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar en el glosario" />
      {terms.status !== 'ready' ? (
        <Skeleton lines={5} />
      ) : (
        <dl className="grid gap-3 md:grid-cols-2">
          {visible.map((t) => (
            <div key={t.id} id={`t-${t.id}`} className={`card p-5 ${focus === t.id ? 'border-red ring-1 ring-red/30' : ''}`}>
              <dt className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-display text-xl font-semibold">{t.termino}</span>
                <span className="text-sm text-muted italic">{t.equivalente_ingles}</span>
              </dt>
              <dd className="mt-2 leading-relaxed text-ink-2">{t.definicion}</dd>
              {t.sinonimos.length > 0 ? <dd className="mt-2 text-sm text-muted">También: {t.sinonimos.join(', ')}</dd> : null}
              <dd className="mt-3 flex flex-wrap items-center gap-3">
                {t.areas.map((a) => (
                  <AreaBadge key={a} area={a} />
                ))}
              </dd>
              <dd className="mt-3">
                <SourceNote fuente={t.fuente} />
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

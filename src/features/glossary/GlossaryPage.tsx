import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { loadGlosario } from '../../data/content';
import {
  filterGlossary,
  glossaryAreas,
  glossarySheet,
  type GlossaryLanguage,
} from '../../domain/content/glossary';
import { AREAS, type Area } from '../../domain/content/schemas';
import { areaLabel } from '../../ui/areas';
import { useAsync, useDocumentTitle } from '../../ui/hooks';
import { Icon } from '../../ui/icons';
import { AreaBadge, EmptyState, PageHeader, Skeleton, SourceNote } from '../../ui/primitives';
import { useToast } from '../../ui/use-toast';
import { downloadFile, XLSX_TYPE } from '../../ui/utils';
import { VigenciaNote } from '../../ui/Vigencia';

export default function GlossaryPage() {
  useDocumentTitle('Glosario');
  const [params, setParams] = useSearchParams();
  const focus = params.get('t');
  const language: GlossaryLanguage = params.get('idioma') === 'en' ? 'en' : 'es';
  const area = (AREAS as readonly string[]).includes(params.get('area') ?? '')
    ? (params.get('area') as Area)
    : 'todas';
  const terms = useAsync(loadGlosario, []);
  const [query, setQuery] = useState('');
  const toast = useToast();

  const setParam = (key: string, value: string | null) =>
    setParams(
      (p) => {
        if (value) p.set(key, value);
        else p.delete(key);
        return p;
      },
      { replace: true },
    );

  const visible = useMemo(
    () => (terms.status === 'ready' ? filterGlossary(terms.data, { query, area, language }) : []),
    [terms, query, area, language],
  );
  const areas = terms.status === 'ready' ? glossaryAreas(terms.data, AREAS) : [];

  useEffect(() => {
    if (focus && terms.status === 'ready')
      document.getElementById(`t-${focus}`)?.scrollIntoView({ block: 'center' });
  }, [focus, terms.status]);

  const download = async () => {
    try {
      // The spreadsheet library is only downloaded when a student exports.
      const { exportXlsx } = await import('../../domain/sheet/xlsx');
      const bytes = exportXlsx(glossarySheet(visible, language), {}, 'en', 'Glosario ES-EN');
      downloadFile(
        language === 'es' ? 'abaco-glosario-es-en.xlsx' : 'abaco-glossary-en-es.xlsx',
        bytes as BlobPart,
        XLSX_TYPE,
      );
      toast.show(`Glosario descargado: ${visible.length} términos.`);
    } catch {
      toast.show('No se pudo crear el Excel del glosario.', 'error');
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Glosario español-inglés"
        title="Palabras que vas a escuchar en clase"
        subtitle="Definiciones en redacción propia, con su equivalente en inglés y la fuente de cada una. Los nombres NIIF siguen la traducción oficial al español de la Fundación IFRS."
      />
      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            className="field h-12 min-w-0 flex-1"
            placeholder={
              language === 'es'
                ? 'Buscar término, sinónimo o palabra en inglés…'
                : 'Search an English term, or its Spanish name…'
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar en el glosario"
          />
          <div className="flex rounded-xl border border-line p-1" role="group" aria-label="Idioma principal">
            {(['es', 'en'] as const).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={language === l}
                onClick={() => setParam('idioma', l === 'es' ? null : 'en')}
                className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${language === l ? 'bg-ink text-paper' : 'text-muted'}`}
              >
                {l === 'es' ? 'Español → inglés' : 'English → español'}
              </button>
            ))}
          </div>
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Áreas">
          {(['todas', ...areas] as const).map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={area === a}
              className="chip shrink-0"
              onClick={() => setParam('area', a === 'todas' ? null : a)}
            >
              {a === 'todas' ? 'Todas' : areaLabel(a)}
            </button>
          ))}
        </div>
        {terms.status === 'ready' ? (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <span aria-live="polite">{`${visible.length} de ${terms.data.length} términos`}</span>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => void download()}
              disabled={visible.length === 0}
            >
              <Icon name="download" /> Descargar en Excel
            </button>
          </div>
        ) : null}
      </div>
      {terms.status !== 'ready' ? (
        <Skeleton lines={5} />
      ) : visible.length === 0 ? (
        <EmptyState icon="search" title="No hay términos con esa búsqueda">
          Prueba en el otro idioma o quita el filtro de área.
        </EmptyState>
      ) : (
        <dl className="grid gap-3 md:grid-cols-2">
          {visible.map((t) => (
            <div
              key={t.id}
              id={`t-${t.id}`}
              className={`card p-5 ${focus === t.id ? 'border-red ring-1 ring-red/30' : ''}`}
            >
              <dt className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-display text-xl font-semibold" lang={language}>
                  {language === 'es' ? t.termino : t.equivalente_ingles}
                </span>
                <span className="text-sm text-muted italic" lang={language === 'es' ? 'en' : 'es'}>
                  {language === 'es' ? t.equivalente_ingles : t.termino}
                </span>
              </dt>
              <dd className="mt-2 leading-relaxed text-ink-2">{t.definicion}</dd>
              {t.sinonimos.length > 0 ? (
                <dd className="mt-2 text-sm text-muted">También: {t.sinonimos.join(', ')}</dd>
              ) : null}
              <dd className="mt-3 flex flex-wrap items-center gap-3">
                {t.areas.map((a) => (
                  <AreaBadge key={a} area={a} />
                ))}
              </dd>
              <dd className="mt-3 space-y-3">
                <VigenciaNote cifras={t.cifras} />
                <SourceNote fuente={t.fuente} />
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { loadFormulas } from '../../data/content';
import type { FormulaCategory } from '../../domain/content/schemas';
import { loadContentIndex, searchContent, suggest, type ContentIndex } from '../../domain/search/content-search';
import { useAsync, useDocumentTitle, useProfile } from '../../ui/hooks';
import { Icon } from '../../ui/icons';
import { AppLink, AreaTile, EmptyState, PageHeader, Skeleton } from '../../ui/primitives';
import { CATEGORY_LABELS } from './categories';

export default function FormulasPage() {
  useDocumentTitle('Fórmulas');
  const profile = useProfile();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const category = (params.get('c') ?? 'todas') as FormulaCategory | 'todas';
  const formulas = useAsync(loadFormulas, []);
  const [index, setIndex] = useState<ContentIndex | null>(null);

  useEffect(() => {
    void loadContentIndex().then(setIndex);
  }, []);

  const visible = useMemo(() => {
    if (formulas.status !== 'ready') return [];
    let list = formulas.data;
    if (query.trim().length >= 2 && index) {
      const order = searchContent(index, query, { types: ['formula'], limit: 100 }).map((h) => h.id.replace('formula:', ''));
      const byId = new Map(list.map((f) => [f.id, f]));
      list = order.map((id) => byId.get(id)).filter((f): f is NonNullable<typeof f> => Boolean(f));
    }
    if (category !== 'todas') list = list.filter((f) => f.categoria === category);
    return list;
  }, [formulas, query, index, category]);

  const suggestions = index && query.trim().length >= 2 && visible.length === 0 ? suggest(index, query) : [];
  const categories = Object.keys(CATEGORY_LABELS) as FormulaCategory[];

  return (
    <div>
      <PageHeader
        eyebrow="Buscador de fórmulas"
        title="Fórmulas verificadas"
        subtitle="Cada ejemplo se recalcula de tres formas antes de publicarse: con la fórmula, con Excel en inglés y con Excel en español."
      />
      <div className="sticky top-16 z-20 -mx-4 mb-6 space-y-3 bg-paper/85 px-4 py-3 backdrop-blur-md">
        <div className="relative">
          <Icon name="search" className="absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setParams((p) => {
                if (e.target.value) p.set('q', e.target.value);
                else p.delete('q');
                return p;
              }, { replace: true });
            }}
            className="field h-14 pl-12 text-lg"
            placeholder="Valor actual, VAN, PAGO, depreciación, IVA…"
            aria-label="Buscar fórmula"
          />
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Categorías">
          {(['todas', ...categories] as const).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              className="chip shrink-0"
              onClick={() =>
                setParams((p) => {
                  if (c === 'todas') p.delete('c');
                  else p.set('c', c);
                  return p;
                }, { replace: true })
              }
            >
              {c === 'todas' ? 'Todas' : CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      {formulas.status === 'loading' ? <Skeleton lines={6} /> : null}
      {formulas.status === 'ready' && visible.length === 0 ? (
        <EmptyState icon="formula" title="No encontramos esa fórmula">
          {suggestions.length > 0 ? (
            <span className="flex flex-wrap justify-center gap-2">
              ¿Quisiste decir?
              {suggestions.map((s) => (
                <button key={s} type="button" className="chip" onClick={() => setQuery(s)}>
                  {s}
                </button>
              ))}
            </span>
          ) : (
            'Prueba con otra palabra o con el nombre de la función de Excel (por ejemplo, PAGO o VNA).'
          )}
        </EmptyState>
      ) : null}

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((f) => (
          <li key={f.id}>
            <AppLink to={`/formulas/${f.id}`} className="card card-lift flex h-full flex-col gap-3 p-4">
              <span className="flex items-start gap-3">
                <AreaTile area={f.areas[0] ?? 'finanzas'} size="sm" />
                <span className="min-w-0">
                  <span className="block leading-snug font-semibold">{f.nombre}</span>
                  <span className="text-xs text-muted">{CATEGORY_LABELS[f.categoria]}</span>
                </span>
              </span>
              <span className="line-clamp-2 text-sm text-muted">{f.descripcion}</span>
              <code className="code-excel mt-auto block text-[0.8rem]">{profile.sintaxisExcel === 'es' ? f.excel.es : f.excel.en}</code>
            </AppLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

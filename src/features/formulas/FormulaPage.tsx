import { m } from 'motion/react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { loadFormulas } from '../../data/content';
import type { Formula } from '../../domain/content/schemas';
import { calculate, parseNumberInput, parseNumberList } from '../../domain/formula/calculator';
import { NotFoundPage } from '../../app/Fallbacks';
import { useAsync, useDocumentTitle, useProfile } from '../../ui/hooks';
import { Icon } from '../../ui/icons';
import { AppLink, AreaBadge, AreaTile, CopyButton, Notice, PageHeader, Skeleton, SourceNote, StarButton } from '../../ui/primitives';
import { AddToCollectionButton } from '../me/AddToCollection';
import { NotesPanel } from '../me/NotesPanel';
import { CATEGORY_LABELS } from './categories';
import { MathFormula } from './MathFormula';

const fmt = (value: number) =>
  Math.abs(value) >= 1000 || Number.isInteger(value)
    ? value.toLocaleString('es-EC', { maximumFractionDigits: 2 })
    : value.toLocaleString('es-EC', { maximumSignificantDigits: 8 });

function Calculator({ formula }: { formula: Formula }) {
  const initial = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(formula.ejemplo.entradas).map(([k, v]) => [k, Array.isArray(v) ? v.map((n) => fmt(n)).join('; ') : fmt(v)]),
      ),
    [formula],
  );
  const [inputs, setInputs] = useState<Record<string, string>>(initial);
  const variables = formula.variables.filter((v) => v.nombre in formula.ejemplo.entradas);

  const parsed: Record<string, number | number[]> | null = useMemo(() => {
    const out: Record<string, number | number[]> = {};
    for (const [key, raw] of Object.entries(inputs)) {
      const isList = Array.isArray(formula.ejemplo.entradas[key]);
      const value = isList ? parseNumberList(raw) : parseNumberInput(raw);
      if (value === null) return null;
      out[key] = value;
    }
    return out;
  }, [inputs, formula]);

  const result = parsed ? calculate(formula.calculo, parsed) : { ok: false as const, message: 'Revisa que todos los datos sean números.' };
  const unknownVar = formula.calculo.incognita ? formula.variables.find((v) => v.nombre === formula.calculo.incognita) : undefined;

  return (
    <section aria-labelledby="calc" className="card overflow-hidden">
      <div className="border-b border-line bg-surface-2 px-5 py-4">
        <h2 id="calc" className="flex items-center gap-2 font-display text-xl font-semibold">
          <Icon name="sparkle" className="text-red" /> Calcula con tus datos
        </h2>
        <p className="text-sm text-muted">Empieza con los datos del ejemplo y cámbialos. Las listas se separan con punto y coma.</p>
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        {variables.map((v) => (
          <label key={v.nombre} className="block">
            <span className="mb-1 flex items-baseline justify-between gap-2 text-sm">
              <span className="font-semibold text-ink">
                <MathFormula latex={v.simbolo} display={false} /> <span className="font-normal text-muted">{v.significado}</span>
              </span>
              <span className="shrink-0 text-xs text-muted">{v.unidad}</span>
            </span>
            <input
              className="field tnum"
              inputMode="decimal"
              value={inputs[v.nombre] ?? ''}
              onChange={(e) => setInputs((prev) => ({ ...prev, [v.nombre]: e.target.value }))}
              aria-label={`${v.significado} (${v.unidad})`}
            />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4" aria-live="polite">
        {result.ok ? (
          <m.p key={result.value} initial={{ opacity: 0.4, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-baseline gap-3">
            <span className="text-sm text-muted">{unknownVar ? `${unknownVar.significado} =` : 'Resultado ='}</span>
            <span className="tnum font-display text-3xl font-semibold text-red">{fmt(result.value)}</span>
            <span className="text-sm text-muted">{formula.ejemplo.unidad}</span>
          </m.p>
        ) : (
          <p className="text-sm font-semibold text-warn">{result.message}</p>
        )}
        <button type="button" className="btn btn-ghost min-h-10 text-sm" onClick={() => setInputs(initial)}>
          Volver al ejemplo
        </button>
      </div>
    </section>
  );
}

export default function FormulaPage() {
  const { formulaId = '' } = useParams();
  const profile = useProfile();
  const state = useAsync(loadFormulas, []);
  const formula = state.status === 'ready' ? state.data.find((f) => f.id === formulaId) : undefined;
  useDocumentTitle(formula?.nombre ?? 'Fórmula');

  if (state.status === 'loading') return <Skeleton lines={5} />;
  if (!formula) return <NotFoundPage />;
  const route = `/formulas/${formula.id}`;
  const excelPrimary = profile.sintaxisExcel === 'es' ? formula.ejemplo.excel_es : formula.ejemplo.excel_en;
  const excelSecondary = profile.sintaxisExcel === 'es' ? formula.ejemplo.excel_en : formula.ejemplo.excel_es;

  return (
    <div className="space-y-10">
      <PageHeader
        back={{ to: '/formulas', label: 'Fórmulas' }}
        eyebrow={CATEGORY_LABELS[formula.categoria]}
        title={
          <span className="flex items-center gap-4">
            <AreaTile area={formula.areas[0] ?? 'finanzas'} size="lg" />
            <span>{formula.nombre}</span>
          </span>
        }
        subtitle={formula.descripcion}
        actions={
          <>
            <StarButton star={{ tipo: 'formula', refId: formula.id, titulo: formula.nombre, ruta: route }} />
            <AddToCollectionButton item={{ tipo: 'formula', refId: formula.id, titulo: formula.nombre, ruta: route }} />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-6">
          <section className="card px-5 py-8" aria-label="Fórmula">
            <MathFormula latex={formula.latex} label={formula.nombre} />
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {formula.areas.map((a) => (
                <AreaBadge key={a} area={a} />
              ))}
            </div>
          </section>

          <section aria-labelledby="variables" className="card p-5">
            <h2 id="variables" className="mb-3 font-display text-xl font-semibold">
              Qué significa cada variable
            </h2>
            <dl className="divide-y divide-line">
              {formula.variables.map((v) => (
                <div key={v.nombre} className="grid grid-cols-[4.5rem_1fr_auto] items-baseline gap-3 py-2.5">
                  <dt className="text-center">
                    <MathFormula latex={v.simbolo} display={false} />
                  </dt>
                  <dd className="text-ink-2">{v.significado}</dd>
                  <dd className="text-xs text-muted">{v.unidad}</dd>
                </div>
              ))}
            </dl>
            {formula.supuestos.length > 0 ? (
              <div className="mt-4 rounded-2xl bg-surface-2 p-4 text-sm text-ink-2">
                <h3 className="mb-1 font-semibold">Supuestos</h3>
                <ul className="list-disc space-y-1 pl-5">
                  {formula.supuestos.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        </div>

        <div className="space-y-6">
          <Calculator formula={formula} />
          <section aria-labelledby="excel" className="card p-5">
            <h2 id="excel" className="mb-3 flex items-center gap-2 font-display text-xl font-semibold">
              <Icon name="lab" className="text-red" /> En Excel
            </h2>
            <p className="mb-2 text-sm text-muted">Forma general ({profile.sintaxisExcel === 'es' ? 'Excel en español' : 'Excel en inglés / Google Sheets'}):</p>
            <code className="code-excel mb-4 block" tabIndex={0}>{profile.sintaxisExcel === 'es' ? formula.excel.es : formula.excel.en}</code>
            <p className="mb-2 text-sm text-muted">El ejemplo, listo para pegar{formula.ejemplo.celdas ? ' (con los datos en las celdas indicadas)' : ''}:</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="code-excel flex-1" tabIndex={0}>{excelPrimary}</code>
              <CopyButton text={excelPrimary} />
            </div>
            <p className="mt-2 text-xs text-muted">
              {profile.sintaxisExcel === 'es' ? 'En inglés: ' : 'En español: '}
              <code className="font-mono">{excelSecondary}</code>
            </p>
            <AppLink to={`/laboratorio/nueva?formula=${formula.id}`} className="btn btn-soft mt-4">
              <Icon name="lab" size={18} /> Probar en el laboratorio
            </AppLink>
          </section>
        </div>
      </div>

      <section aria-labelledby="ejemplo" className="card p-5 md:p-6">
        <h2 id="ejemplo" className="mb-2 font-display text-2xl font-semibold">
          Ejemplo resuelto
        </h2>
        <p className="mb-4 text-[1.02rem] leading-relaxed text-ink-2">{formula.ejemplo.enunciado}</p>
        <ol className="space-y-2">
          {formula.ejemplo.pasos.map((paso, i) => (
            <li key={paso} className="flex gap-3">
              <span className="tnum grid h-7 w-7 shrink-0 place-items-center rounded-full bg-red-soft text-sm font-bold text-red">{i + 1}</span>
              <span className="tnum pt-0.5 text-ink-2">{paso}</span>
            </li>
          ))}
        </ol>
        <p className="mt-5 flex items-baseline gap-3 border-t border-line pt-4">
          <span className="text-sm text-muted">Resultado publicado</span>
          <span className="tnum font-display text-2xl font-semibold">
            {fmt(formula.ejemplo.resultado)} <span className="text-base font-normal text-muted">{formula.ejemplo.unidad}</span>
          </span>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-ok-soft px-2.5 py-1 text-xs font-semibold text-ok">
            <Icon name="check" size={14} /> Verificado automáticamente
          </span>
        </p>
      </section>

      {formula.notas.length > 0 ? (
        <div className="space-y-2">
          {formula.notas.map((n) => (
            <Notice key={n} tone="warn">
              {n}
            </Notice>
          ))}
        </div>
      ) : null}

      <SourceNote fuente={formula.fuente} />
      <NotesPanel refTipo="formula" refId={formula.id} title="Mis apuntes de esta fórmula" />
    </div>
  );
}

import { lazy, Suspense } from 'react';
import { useParams } from 'react-router';
import { loadFormulas } from '../../data/content';
import { NotFoundPage } from '../../app/Fallbacks';
import { useAsync, useDocumentTitle } from '../../ui/hooks';
import { useProfile } from '../../ui/use-profile';
import { Icon } from '../../ui/icons';
import {
  AppLink,
  AreaBadge,
  AreaTile,
  CopyButton,
  Notice,
  PageHeader,
  Skeleton,
  SourceNote,
} from '../../ui/primitives';
import { StarButton } from '../../ui/StarButton';
import { useCifrasVencidas } from '../../ui/use-vigencia';
import { VigenciaNote } from '../../ui/Vigencia';
import { AddToCollectionButton } from '../me/AddToCollection';
import { NotesPanel } from '../me/NotesPanel';
import { CATEGORY_LABELS } from './categories';
import { formatNumber as fmt } from './format';
import { loadMath } from './math';
import { MathFormula } from './MathFormula';

// The calculator brings the formula engine (about 50 KB): it loads after the formula itself is on screen.
const Calculator = lazy(() => import('./Calculator'));

export default function FormulaPage() {
  const { formulaId = '' } = useParams();
  const profile = useProfile();
  const state = useAsync(async () => {
    const [formulas, math] = await Promise.all([loadFormulas(), loadMath(formulaId)]);
    return { formula: formulas.find((f) => f.id === formulaId), math };
  }, [formulaId]);
  const formula = state.status === 'ready' ? state.data.formula : undefined;
  const math = state.status === 'ready' ? state.data.math : {};
  useDocumentTitle(formula?.nombre ?? 'Fórmula');
  const vencidas = useCifrasVencidas(formula?.cifras);

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
            <AddToCollectionButton
              item={{ tipo: 'formula', refId: formula.id, titulo: formula.nombre, ruta: route }}
            />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-6">
          <section className="card px-5 py-8" aria-label="Fórmula">
            <MathFormula latex={formula.latex} html={math[`D:${formula.latex}`]} label={formula.nombre} />
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
                    <MathFormula latex={v.simbolo} html={math[`I:${v.simbolo}`]} display={false} />
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
          <Suspense fallback={<Skeleton lines={8} />}>
            <Calculator formula={formula} math={math} />
          </Suspense>
          <section aria-labelledby="excel" className="card p-5">
            <h2 id="excel" className="mb-3 flex items-center gap-2 font-display text-xl font-semibold">
              <Icon name="lab" className="text-red" /> En Excel
            </h2>
            <p className="mb-2 text-sm text-muted">
              Forma general (
              {profile.sintaxisExcel === 'es' ? 'Excel en español' : 'Excel en inglés / Google Sheets'}):
            </p>
            <code className="code-excel mb-4 block" tabIndex={0}>
              {profile.sintaxisExcel === 'es' ? formula.excel.es : formula.excel.en}
            </code>
            <p className="mb-2 text-sm text-muted">
              El ejemplo, listo para pegar
              {formula.ejemplo.celdas ? ' (con los datos en las celdas indicadas)' : ''}:
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="code-excel flex-1" tabIndex={0}>
                {excelPrimary}
              </code>
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
              <span className="tnum grid h-7 w-7 shrink-0 place-items-center rounded-full bg-red-soft text-sm font-bold text-red">
                {i + 1}
              </span>
              <span className="tnum pt-0.5 text-ink-2">{paso}</span>
            </li>
          ))}
        </ol>
        <p className="mt-5 flex items-baseline gap-3 border-t border-line pt-4">
          <span className="text-sm text-muted">Resultado publicado</span>
          <span className="tnum font-display text-2xl font-semibold">
            {fmt(formula.ejemplo.resultado)}{' '}
            <span className="text-base font-normal text-muted">{formula.ejemplo.unidad}</span>
          </span>
          {vencidas.length > 0 ? (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-warn-soft px-2.5 py-1 text-xs font-semibold text-warn">
              <Icon name="info" size={14} /> Cifra por verificar
            </span>
          ) : (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-ok-soft px-2.5 py-1 text-xs font-semibold text-ok">
              <Icon name="check" size={14} /> Verificado automáticamente
            </span>
          )}
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

      <VigenciaNote cifras={formula.cifras} />
      <SourceNote fuente={formula.fuente} />
      <NotesPanel refTipo="formula" refId={formula.id} title="Mis apuntes de esta fórmula" />
    </div>
  );
}

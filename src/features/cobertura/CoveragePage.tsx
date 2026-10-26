import { useSearchParams } from 'react-router';
import { carreras, getMateria, materias } from '../../data/content';
import { careerCoverage, ESTANDAR, type CoverageReport } from '../../domain/content/coverage';
import coverageJson from '../../generated/cobertura.json';
import { useDocumentTitle } from '../../ui/hooks';
import { AppLink, PageHeader } from '../../ui/primitives';
import { ordinal } from '../subjects/career-selection';

const reports = new Map((coverageJson as unknown as CoverageReport[]).map((r) => [r.materiaId, r]));

function Bar({ value }: { value: number }) {
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
      <span className="block h-full rounded-full bg-red" style={{ width: `${Math.round(value * 100)}%` }} />
    </span>
  );
}

/** Public panel: by career and cycle, which subjects are complete, partial or not in ÁBACO yet. */
export default function CoveragePage() {
  useDocumentTitle('Cobertura del contenido');
  const [params, setParams] = useSearchParams();
  const carrera = carreras.find((c) => c.id === params.get('carrera')) ?? carreras[0]!;
  const cycles = careerCoverage(carrera, reports);
  const all = [...reports.values()];
  const completas = materias.filter((m) => m.cobertura.estado === 'completa').length;
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Transparencia"
        title="Cobertura del contenido"
        subtitle={`Cuánto de cada carrera cubre ÁBACO hoy, ciclo por ciclo. Una materia está completa cuando tiene de ${ESTANDAR.unidadesMin} a ${ESTANDAR.unidadesMax} unidades con ${ESTANDAR.subtemasPorUnidadMin} a ${ESTANDAR.subtemasPorUnidadMax} subtemas cada una, teoría y ejemplo en cada subtema y 2 ejercicios por subtema de cálculo. Preferimos decir lo que falta antes que aparentar que está todo.`}
      />
      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <dt className="text-xs font-semibold tracking-wide text-muted uppercase">Materias completas</dt>
          <dd className="tnum mt-1 font-display text-3xl font-semibold">
            {completas} <span className="text-base font-normal text-muted">de {materias.length}</span>
          </dd>
        </div>
        <div className="card p-4">
          <dt className="text-xs font-semibold tracking-wide text-muted uppercase">Subtemas publicados</dt>
          <dd className="tnum mt-1 font-display text-3xl font-semibold">
            {all.reduce((n, r) => n + r.subtemas, 0)}
          </dd>
        </div>
        <div className="card p-4">
          <dt className="text-xs font-semibold tracking-wide text-muted uppercase">Avance promedio</dt>
          <dd className="tnum mt-1 font-display text-3xl font-semibold">
            {Math.round((all.reduce((n, r) => n + r.avance, 0) / Math.max(1, all.length)) * 100)} %
          </dd>
        </div>
      </dl>

      <label className="block max-w-md">
        <span className="mb-1 block text-sm font-semibold text-ink-2">Carrera</span>
        <select
          className="field"
          value={carrera.id}
          onChange={(e) => setParams({ carrera: e.target.value }, { replace: true })}
        >
          {carreras.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </label>

      <ol className="space-y-5">
        {cycles.map((cycle) => (
          <li key={cycle.ciclo} className="card space-y-3 p-5">
            <h2 className="font-display text-xl font-semibold">{ordinal(cycle.ciclo)} ciclo</h2>
            {cycle.materias.length > 0 ? (
              <ul className="grid gap-3 md:grid-cols-2">
                {cycle.materias.map((r) => {
                  const m = getMateria(r.materiaId);
                  const estado = m?.cobertura.estado ?? 'parcial';
                  return (
                    <li key={r.materiaId} className="rounded-xl border border-line p-3">
                      <span className="flex flex-wrap items-baseline justify-between gap-2">
                        <AppLink
                          to={`/materia/${r.materiaId}`}
                          className="font-semibold text-ink hover:text-red"
                        >
                          {r.nombre}
                        </AppLink>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${estado === 'completa' ? 'bg-ok-soft text-ok' : 'bg-warn-soft text-warn'}`}
                        >
                          {estado === 'completa' ? 'Completa' : 'Parcial'}
                        </span>
                      </span>
                      <span className="tnum mt-1 block text-xs text-muted">
                        {r.unidades} de {r.unidadesObjetivo} unidades · {r.subtemas} subtemas ·{' '}
                        {r.subtemasCalculoConPractica} de {r.subtemasCalculo} subtemas de cálculo con 2
                        ejercicios
                      </span>
                      <span className="mt-2 block">
                        <Bar value={r.avance} />
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted">Ninguna materia de este ciclo está en ÁBACO todavía.</p>
            )}
            {cycle.pendientes.length > 0 ? (
              <p className="text-sm text-ink-2">
                <span className="font-semibold">Todavía no están en ÁBACO:</span>{' '}
                {cycle.pendientes.map((p) => p.nombre).join(', ')}.
              </p>
            ) : null}
          </li>
        ))}
      </ol>
      <p className="text-sm text-muted">
        Los datos salen de {carrera.planes}{' '}
        {carrera.planes === 1 ? 'plan de estudios público' : 'planes de estudio públicos'} de esta carrera,
        sin nombres de universidades: cada una puede ubicar las materias en otro ciclo.{' '}
        <AppLink to="/sugerencias" className="link-red">
          ¿Quieres aportar contenido?
        </AppLink>
      </p>
    </div>
  );
}

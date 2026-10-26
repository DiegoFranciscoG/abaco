import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { getCarrera, getMateria, loadEjercicios } from '../../data/content';
import { listAttempts } from '../../data/repositories';
import { listAllExams } from '../../data/study-repositories';
import {
  careerProgress,
  MASTERY,
  type MallaCelda,
  type MallaEstado,
} from '../../domain/study/career-progress';
import { useAsync } from '../../ui/hooks';
import { Icon, type IconName } from '../../ui/icons';
import { AppLink } from '../../ui/primitives';
import { useProfile } from '../../ui/use-profile';
import { ordinal } from '../subjects/career-selection';
import { summarizeAttempts } from '../practice/progress';

/** Each state has its own word and mark besides its color, so it reads in grayscale and with a screen reader. */
const ESTADOS: Record<MallaEstado, { label: string; icon: IconName | null; className: string }> = {
  dominada: { label: 'Dominada', icon: 'check', className: 'border-ok bg-ok-soft text-ok' },
  'en-curso': { label: 'En curso', icon: 'target', className: 'border-warn bg-warn-soft text-warn' },
  'sin-empezar': { label: 'Sin empezar', icon: null, className: 'border-line bg-surface text-ink-2' },
  'fuera-de-abaco': {
    label: 'Aún no está en ÁBACO',
    icon: null,
    className: 'border-dashed border-line text-muted',
  },
};

function detail(c: MallaCelda): string {
  if (c.estado === 'fuera-de-abaco') return ESTADOS[c.estado].label;
  const parts = [];
  if (c.total > 0) parts.push(`${c.resueltos}/${c.total} ejercicios`);
  parts.push(c.mejorExamen === null ? 'sin examen' : `examen ${Math.round(c.mejorExamen * 100)} %`);
  return parts.join(' · ');
}

function Cell({ c }: { c: MallaCelda }) {
  const style = ESTADOS[c.estado];
  const body = (
    <>
      <span className="flex items-start justify-between gap-2">
        <span className="text-sm leading-snug font-semibold">{c.nombre}</span>
        {style.icon ? <Icon name={style.icon} size={16} className="mt-0.5 shrink-0" /> : null}
      </span>
      <span className="mt-1 block text-xs">
        <span className="font-semibold">{style.label}</span>
        {c.estado === 'fuera-de-abaco' ? null : ` · ${detail(c)}`}
      </span>
    </>
  );
  const className = `block h-full rounded-xl border-2 p-3 ${style.className}`;
  return c.id ? (
    <AppLink to={`/materia/${c.id}`} className={`${className} card-lift`}>
      {body}
    </AppLink>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** The career map of the profile, colored by what the student solved and the exams they passed. */
export function CareerMap() {
  const profile = useProfile();
  const carrera = profile.carrera ? getCarrera(profile.carrera) : undefined;
  const attempts = useLiveQuery(() => listAttempts(), [], []);
  const exams = useLiveQuery(() => listAllExams(), [], []);
  const exercises = useAsync(loadEjercicios, []);

  const progress = useMemo(() => {
    if (!carrera || exercises.status !== 'ready') return null;
    const solved = new Set(
      [...summarizeAttempts(attempts ?? []).entries()].filter(([, p]) => p.solved).map(([id]) => id),
    );
    return careerProgress(carrera, {
      exercises: exercises.data,
      solved,
      exams: exams ?? [],
      nombre: (id) => getMateria(id)?.nombre ?? id,
    });
  }, [carrera, exercises, attempts, exams]);

  if (!carrera)
    return (
      <div className="card flex flex-wrap items-center gap-4 p-5">
        <span className="tile">
          <Icon name="materias" />
        </span>
        <p className="min-w-0 flex-1 text-sm">
          Elige tu carrera y tu ciclo en Materias y aquí verás tu avance sobre toda la malla, ciclo por ciclo.
        </p>
        <AppLink to="/materias" className="btn btn-primary">
          Elegir carrera
        </AppLink>
      </div>
    );
  if (!progress) return null;
  const { resumen } = progress;

  return (
    <section aria-labelledby="malla" className="space-y-5">
      <div>
        <h2 id="malla" className="font-display text-2xl font-semibold">
          Tu malla: {carrera.nombre}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {resumen.dominadas} dominadas · {resumen.enCurso} en curso · {resumen.sinEmpezar} sin empezar, de{' '}
          {resumen.enAbaco} materias que ÁBACO cubre
          {resumen.fueraDeAbaco > 0 ? ` (y ${resumen.fueraDeAbaco} que aún no tiene)` : ''}. Una materia queda
          dominada con un examen de práctica de {Math.round(MASTERY.exam * 100)} % o más y, si tiene
          ejercicios, con al menos el {Math.round(MASTERY.exercises * 100)} % resuelto: es un criterio de
          ÁBACO, no de tu universidad.
        </p>
      </div>
      {progress.ciclos.map(({ ciclo, celdas }) =>
        celdas.length === 0 ? null : (
          <div key={ciclo}>
            <h3 className="mb-2 text-sm font-semibold tracking-wide text-muted uppercase">
              {ordinal(ciclo)} ciclo{profile.ciclo === ciclo ? ' · tu ciclo' : ''}
            </h3>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {celdas.map((c) => (
                <li key={c.id ?? c.nombre}>
                  <Cell c={c} />
                </li>
              ))}
            </ul>
          </div>
        ),
      )}
    </section>
  );
}

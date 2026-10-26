import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { getMateria, loadEjercicios } from '../../data/content';
import { listAttempts } from '../../data/repositories';
import { parseAssignment } from '../../domain/teacher/assignment';
import { useAsync, useDocumentTitle } from '../../ui/hooks';
import { Icon } from '../../ui/icons';
import { AppLink, PageHeader, Skeleton } from '../../ui/primitives';
import { summarizeAttempts } from './progress';

export default function PracticePage() {
  useDocumentTitle('Práctica');
  const [params] = useSearchParams();
  const only = params.get('materia');
  const data = useAsync(async () => {
    const exercises = await loadEjercicios();
    const names = new Map(
      exercises.map((e) => [e.materia, getMateria(e.materia)?.nombre ?? e.materia] as const),
    );
    return { exercises, names };
  }, []);
  const attempts = useLiveQuery(() => listAttempts(), [], []);
  const summary = useMemo(() => summarizeAttempts(attempts ?? []), [attempts]);

  if (data.status !== 'ready') return <Skeleton lines={5} />;
  // A teacher's worksheet ("taller") arrives as a list of exercise ids in the link.
  const byId = new Map(data.data.exercises.map((e) => [e.id, e]));
  const assignment = parseAssignment(params, new Set(byId.keys()));
  const groups = new Map<string, typeof data.data.exercises>();
  if (assignment) {
    groups.set(
      'taller',
      assignment.ids.map((id) => byId.get(id)!),
    );
  } else {
    for (const e of data.data.exercises) {
      if (only && e.materia !== only) continue;
      groups.set(e.materia, [...(groups.get(e.materia) ?? []), e]);
    }
  }
  const scope = assignment ? (groups.get('taller') ?? []) : data.data.exercises;
  const solved = scope.filter((e) => summary.get(e.id)?.solved).length;

  return (
    <div>
      <PageHeader
        eyebrow={assignment ? 'Taller de tu docente' : 'Práctica y autoevaluación'}
        title={assignment ? assignment.titulo || 'Taller' : 'Ejercicios con respuesta verificable'}
        subtitle={
          assignment
            ? `${assignment.ids.length} ejercicios elegidos por tu docente. Cada respuesta se corrige al instante y tus intentos se guardan solo en este dispositivo.`
            : 'Cada respuesta se comprueba con tolerancia; tus intentos se guardan solo en este dispositivo.'
        }
        actions={
          <div className="card flex items-center gap-3 px-4 py-2">
            <span className="tnum font-display text-2xl font-semibold text-red">
              {solved}/{scope.length}
            </span>
            <span className="text-sm text-muted">resueltos</span>
          </div>
        }
      />
      {only || assignment ? (
        <AppLink to="/practica" className="link-red mb-6 inline-block text-sm">
          ← Ver todos los ejercicios
        </AppLink>
      ) : (
        <AppLink to="/profesor" className="link-red mb-6 inline-block text-sm">
          ¿Eres docente? Arma un taller con estos ejercicios →
        </AppLink>
      )}
      <div className="space-y-10">
        {[...groups.entries()].map(([subjectId, list]) => (
          <section key={subjectId} aria-labelledby={`ej-${subjectId}`}>
            <h2
              id={`ej-${subjectId}`}
              className={assignment ? 'sr-only' : 'mb-3 font-display text-2xl font-semibold'}
            >
              {assignment ? 'Ejercicios del taller' : (data.data.names.get(subjectId) ?? subjectId)}
            </h2>
            <ul className="grid gap-2.5 md:grid-cols-2">
              {list.map((e, i) => {
                const s = summary.get(e.id);
                return (
                  <li key={e.id}>
                    <AppLink
                      to={`/practica/${e.id}`}
                      className="card card-lift flex h-full items-start gap-3 p-4"
                    >
                      <span
                        className={`tnum grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold ${
                          s?.solved
                            ? 'bg-ok-soft text-ok'
                            : s
                              ? 'bg-warn-soft text-warn'
                              : 'bg-red-soft text-red'
                        }`}
                        aria-label={s?.solved ? 'Resuelto' : s ? 'Intentado' : 'Sin intentar'}
                      >
                        {s?.solved ? <Icon name="check" size={18} /> : i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-sm text-ink">{e.enunciado}</span>
                        <span className="mt-1 flex gap-3 text-xs text-muted">
                          <span>
                            {'●'.repeat(e.dificultad)}
                            {'○'.repeat(3 - e.dificultad)}
                          </span>
                          {s ? (
                            <span className="tnum">
                              {s.attempts} intento{s.attempts === 1 ? '' : 's'}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </AppLink>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

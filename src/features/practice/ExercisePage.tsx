import { useLiveQuery } from 'dexie-react-hooks';
import { AnimatePresence, m } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { loadEjercicios, loadFormulas } from '../../data/content';
import type { Ejercicio, Formula } from '../../domain/content/schemas';
import { listAttempts, recordAttempt } from '../../data/repositories';
import { parseAnswer } from '../../domain/formula/calculator';
import { isClose } from '../../domain/formula';
import { NotFoundPage } from '../../app/Fallbacks';
import { useAsync, useDocumentTitle } from '../../ui/hooks';
import { Icon } from '../../ui/icons';
import { AppLink, Notice, PageHeader, Skeleton, SourceNote } from '../../ui/primitives';
import { StarButton } from '../../ui/StarButton';
import { formatDate } from '../../ui/utils';
import { useToast } from '../../ui/use-toast';

export default function ExercisePage() {
  const { ejercicioId = '' } = useParams();
  const state = useAsync(async () => {
    const [list, formulas] = await Promise.all([loadEjercicios(), loadFormulas()]);
    const index = list.findIndex((e) => e.id === ejercicioId);
    return { exercise: list[index], next: list[index + 1], formulas };
  }, [ejercicioId]);
  useDocumentTitle('Ejercicio');
  if (state.status === 'loading') return <Skeleton lines={4} />;
  if (state.status === 'error' || !state.data.exercise) return <NotFoundPage />;
  // A new key per exercise resets the answer, hints and timer when moving to the next one.
  return (
    <ExerciseView
      key={state.data.exercise.id}
      exercise={state.data.exercise}
      next={state.data.next}
      formulas={state.data.formulas}
    />
  );
}

function ExerciseView({
  exercise,
  next,
  formulas,
}: {
  exercise: Ejercicio;
  next: Ejercicio | undefined;
  formulas: Formula[];
}) {
  const toast = useToast();
  const attempts = useLiveQuery(() => listAttempts(exercise.id), [exercise.id], []);
  const [answer, setAnswer] = useState('');
  const [hints, setHints] = useState(0);
  const [outcome, setOutcome] = useState<null | { correct: boolean }>(null);
  const [showSolution, setShowSolution] = useState(false);
  const started = useRef(0);
  useEffect(() => {
    started.current = Date.now();
  }, []);

  const formula = exercise.formula ? formulas.find((f) => f.id === exercise.formula) : undefined;
  const expectsProportion = exercise.unidad === 'proporción';

  const check = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = parseAnswer(answer, expectsProportion);
    if (value === null) {
      toast.show('Escribe un número (puedes usar coma decimal).', 'error');
      return;
    }
    const correct = isClose(value, exercise.respuesta, exercise.tolerancia);
    setOutcome({ correct });
    try {
      await recordAttempt({
        ejercicioId: exercise.id,
        respuesta: value,
        correcto: correct,
        segundos: (Date.now() - started.current) / 1000,
      });
    } catch (error) {
      toast.error(error);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        back={{ to: '/practica', label: 'Práctica' }}
        eyebrow={`Dificultad ${exercise.dificultad} de 3`}
        title="Resuelve"
        actions={
          <StarButton
            compact
            star={{
              tipo: 'ejercicio',
              refId: exercise.id,
              titulo: exercise.enunciado.slice(0, 90),
              ruta: `/practica/${exercise.id}`,
            }}
          />
        }
      />
      <section className="card p-6">
        <p className="text-lg leading-relaxed">{exercise.enunciado}</p>
        <form onSubmit={check} className="mt-6 flex flex-wrap items-end gap-3">
          <label className="min-w-48 flex-1">
            <span className="mb-1.5 block text-sm font-semibold text-ink-2">
              Tu respuesta ({exercise.unidad})
            </span>
            <input
              className="field tnum h-14 text-xl"
              inputMode="decimal"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={expectsProportion ? '0,25 o 25 %' : 'Ej.: 1.050,00'}
              aria-describedby="tolerancia"
            />
          </label>
          <button type="submit" className="btn btn-primary h-14 px-6" disabled={!answer.trim()}>
            Comprobar
          </button>
        </form>
        <p id="tolerancia" className="mt-2 text-xs text-muted">
          Se acepta una diferencia de hasta {exercise.tolerancia.toLocaleString('es-EC')} por redondeo.
        </p>
        <AnimatePresence>
          {outcome ? (
            <m.div
              key={String(outcome.correct) + answer}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="mt-5"
            >
              <Notice tone={outcome.correct ? 'ok' : 'warn'} icon={outcome.correct ? 'check' : 'info'}>
                {outcome.correct
                  ? '¡Correcto! Mira el procedimiento para repasar el razonamiento.'
                  : 'Todavía no. Pide una pista o revisa tus unidades y signos.'}
              </Notice>
            </m.div>
          ) : null}
        </AnimatePresence>
      </section>

      <section className="card p-6" aria-labelledby="pistas">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="pistas" className="font-display text-xl font-semibold">
            Pistas
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              disabled={hints >= exercise.pistas.length}
              onClick={() => setHints((h) => h + 1)}
            >
              <Icon name="sparkle" size={18} /> Una pista más
            </button>
            <button type="button" className="btn btn-soft" onClick={() => setShowSolution(true)}>
              Ver procedimiento
            </button>
          </div>
        </div>
        {hints > 0 ? (
          <ol className="mt-4 space-y-2">
            {exercise.pistas.slice(0, hints).map((p, i) => (
              <li key={p} className="flex gap-3">
                <span className="tnum grid h-6 w-6 shrink-0 place-items-center rounded-full bg-red-soft text-xs font-bold text-red">
                  {i + 1}
                </span>
                <span className="text-ink-2">{p}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Las pistas aparecen de una en una, de la más general a la más concreta.
          </p>
        )}
        {showSolution || outcome?.correct ? (
          <div className="mt-5 border-t border-line pt-4">
            <h3 className="eyebrow mb-2">Procedimiento</h3>
            <ol className="space-y-1.5">
              {exercise.procedimiento.map((p) => (
                <li key={p} className="tnum text-ink-2">
                  {p}
                </li>
              ))}
            </ol>
            <p className="mt-3 font-semibold">
              Respuesta:{' '}
              <span className="tnum text-red">
                {exercise.respuesta.toLocaleString('es-EC', { maximumFractionDigits: 4 })}
              </span>{' '}
              {exercise.unidad}
            </p>
          </div>
        ) : null}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {formula ? (
          <AppLink to={`/formulas/${formula.id}`} className="chip hover:border-red hover:text-red">
            <Icon name="formula" size={15} /> Fórmula: {formula.nombre}
          </AppLink>
        ) : (
          <span />
        )}
        {next ? (
          <AppLink to={`/practica/${next.id}`} className="btn btn-ghost">
            Siguiente ejercicio <Icon name="arrow-right" size={18} />
          </AppLink>
        ) : null}
      </div>

      {attempts && attempts.length > 0 ? (
        <section aria-labelledby="historial" className="card p-5">
          <h2 id="historial" className="mb-3 font-semibold">
            Tus intentos
          </h2>
          <ul className="space-y-1 text-sm">
            {attempts.slice(0, 8).map((a) => (
              <li key={a.id} className="flex items-center gap-3">
                <span className={`h-2 w-2 rounded-full ${a.correcto ? 'bg-ok' : 'bg-red'}`} />
                <span className="tnum">
                  {a.respuesta.toLocaleString('es-EC', { maximumFractionDigits: 4 })}
                </span>
                <span className="text-muted">{a.correcto ? 'correcto' : 'incorrecto'}</span>
                <span className="tnum ml-auto text-xs text-muted">
                  {a.segundos} s · {formatDate(a.fecha)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <SourceNote fuente={exercise.fuente} />
    </div>
  );
}

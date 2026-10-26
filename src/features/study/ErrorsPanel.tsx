import { useLiveQuery } from 'dexie-react-hooks';
import { useId, useState } from 'react';
import {
  countUsage,
  dueMistakes,
  EVERYDAY_LIMITS,
  hardSubtopics,
  listMistakes,
  reviewMistake,
} from '../../data/everyday-repositories';
import type { ErrorRepaso } from '../../data/types';
import type { Materia } from '../../domain/content/schemas';
import { isCorrect } from '../../domain/study/quiz';
import { Icon } from '../../ui/icons';
import { AppLink } from '../../ui/primitives';
import { useToast } from '../../ui/use-toast';
import { QuestionView } from './ExamPanel';

/**
 * Review of the questions failed in practice exams, with spaced repetition (SM-2): a right answer brings the
 * question back in 1, 6 and more days; three right answers in a row master it, a wrong one starts it over.
 */
export function ErrorsPanel({ materia }: { materia: Materia }) {
  const id = useId();
  const toast = useToast();
  const rows = useLiveQuery(() => listMistakes(materia.id), [materia.id], []);
  const [now, setNow] = useState(() => new Date());
  const [session, setSession] = useState<ErrorRepaso[] | null>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<number | string | null>(null);
  const [checked, setChecked] = useState<boolean | null>(null);
  const [aciertos, setAciertos] = useState(0);

  const due = dueMistakes(rows, now);
  const pending = rows.filter((e) => !e.dominada);
  const mastered = rows.length - pending.length;
  const hard = hardSubtopics(rows).slice(0, 5);
  const current = session?.[index];

  const start = () => {
    const at = new Date();
    setNow(at);
    setSession(dueMistakes(rows, at));
    setIndex(0);
    setAnswer(null);
    setChecked(null);
    setAciertos(0);
    void countUsage('repaso');
  };

  const check = async () => {
    if (!current) return;
    const ok = isCorrect(current.pregunta, answer);
    setChecked(ok);
    if (ok) setAciertos((n) => n + 1);
    try {
      await reviewMistake(current.id, ok);
    } catch (error) {
      toast.error(error);
    }
  };

  const next = () => {
    setIndex((i) => i + 1);
    setAnswer(null);
    setChecked(null);
  };

  return (
    <section aria-labelledby={`${id}-t`} className="space-y-5">
      <div className="card space-y-3 p-5">
        <h2 id={`${id}-t`} className="font-display text-xl font-semibold">
          Repaso de errores
        </h2>
        <p className="text-sm text-ink-2">
          Cada pregunta que fallas en un examen de {materia.nombre} vuelve aquí. Si la aciertas, vuelve en 1
          día, luego en 6 y cada vez más tarde; cuando la aciertas {EVERYDAY_LIMITS.masteredAfter} veces
          seguidas queda dominada. Si la fallas, empieza de nuevo.
        </p>
        <dl className="tnum grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-surface-2 p-3">
            <dt className="text-xs text-muted">Para repasar hoy</dt>
            <dd className="font-display text-2xl font-semibold text-red">{due.length}</dd>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <dt className="text-xs text-muted">En repaso</dt>
            <dd className="font-display text-2xl font-semibold">{pending.length}</dd>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <dt className="text-xs text-muted">Dominadas</dt>
            <dd className="font-display text-2xl font-semibold text-ok">{mastered}</dd>
          </div>
        </dl>
        <button type="button" className="btn btn-primary" disabled={due.length === 0} onClick={start}>
          <Icon name="target" size={18} />{' '}
          {due.length > 0 ? `Repasar ahora (${due.length})` : 'Nada para repasar hoy'}
        </button>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">
            Todavía no hay errores guardados: haz un examen en la pestaña «Examen» y las preguntas que falles
            aparecerán aquí.
          </p>
        ) : null}
      </div>

      {session ? (
        current ? (
          <div className="space-y-3">
            <p className="tnum text-sm text-muted">
              Pregunta {index + 1} de {session.length}
            </p>
            <QuestionView
              key={current.id}
              q={current.pregunta}
              index={index}
              answer={answer}
              onAnswer={setAnswer}
              graded={checked}
            />
            {checked === null ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={answer === null || answer === ''}
                onClick={() => void check()}
              >
                <Icon name="check" size={18} /> Comprobar
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={next}>
                {index + 1 < session.length ? 'Siguiente pregunta' : 'Terminar'}{' '}
                <Icon name="arrow-right" size={18} />
              </button>
            )}
          </div>
        ) : (
          <div role="status" className="card p-5">
            <p className="font-display text-xl font-semibold">
              Acertaste {aciertos} de {session.length}
            </p>
            <p className="mt-1 text-sm text-ink-2">
              Las que acertaste vuelven más adelante; las que fallaste, mañana.
            </p>
          </div>
        )
      ) : null}

      {hard.length > 0 ? (
        <div className="card p-5">
          <h3 className="mb-2 font-semibold">Los subtemas que más te cuestan</h3>
          <ol className="space-y-2 text-sm">
            {hard.map((h) => {
              const route = rows.find((e) => e.subtemaId === h.subtemaId)?.pregunta.ruta;
              return (
                <li key={h.subtemaId} className="flex flex-wrap items-baseline justify-between gap-2">
                  {route ? (
                    <AppLink to={route} className="link-red font-semibold">
                      {h.nombre}
                    </AppLink>
                  ) : (
                    <span className="font-semibold">{h.nombre}</span>
                  )}
                  <span className="tnum text-xs text-muted">
                    {h.fallos} {h.fallos === 1 ? 'error' : 'errores'} · {h.pendientes} en repaso
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}
    </section>
  );
}

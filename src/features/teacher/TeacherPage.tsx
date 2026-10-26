import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { getMateria, loadEjercicios, materias } from '../../data/content';
import { countUsage } from '../../data/everyday-repositories';
import type { Ejercicio } from '../../domain/content/schemas';
import { ASSIGNMENT_LIMITS, assignmentPath, cleanTitle, formatAnswer } from '../../domain/teacher/assignment';
import { useAsync, useDocumentTitle } from '../../ui/hooks';
import { Icon } from '../../ui/icons';
import { AppLink, EmptyState, PageHeader, Skeleton, SourceNote } from '../../ui/primitives';
import { useToast } from '../../ui/use-toast';
import { SelectInput, TextInput } from '../deliverables/fields';

type Sheet = 'estudiante' | 'solucionario';
const LEVEL = { 1: 'Básico', 2: 'Intermedio', 3: 'Avanzado' } as const;

export default function TeacherPage() {
  useDocumentTitle('Modo profesor');
  const [params, setParams] = useSearchParams();
  const exercises = useAsync(loadEjercicios, []);
  const toast = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [sheet, setSheet] = useState<Sheet>('estudiante');

  const subjects = useMemo(() => {
    if (exercises.status !== 'ready') return [];
    const withExercises = new Set(exercises.data.map((e) => e.materia));
    return materias.filter((m) => withExercises.has(m.id));
  }, [exercises]);
  const subjectId = params.get('materia') ?? subjects[0]?.id ?? '';
  const subject = getMateria(subjectId);
  const list = exercises.status === 'ready' ? exercises.data.filter((e) => e.materia === subjectId) : [];
  const chosen = selected
    .map((id) => list.find((e) => e.id === id))
    .filter((e): e is Ejercicio => e !== undefined);
  const heading = cleanTitle(title) || `Taller de ${subject?.nombre ?? 'ejercicios'}`;
  const path = assignmentPath({ titulo: heading, ids: chosen.map((e) => e.id) });

  const toggle = (id: string) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : s.length < ASSIGNMENT_LIMITS.maxExercises ? [...s, id] : s,
    );

  const changeSubject = (id: string) => {
    setSelected([]);
    setParams({ materia: id }, { replace: true });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}${location.pathname}#${path}`);
      void countUsage('taller');
      toast.show('Enlace copiado: tus estudiantes abren el taller y se corrigen solos.');
    } catch {
      toast.show('Tu navegador no permitió copiar el enlace.', 'error');
    }
  };

  const print = (which: Sheet) => {
    setSheet(which);
    // Print after React shows the chosen sheet.
    window.setTimeout(() => window.print(), 50);
  };

  if (exercises.status !== 'ready') return <Skeleton lines={6} />;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Modo profesor"
        title="Arma un taller con ejercicios verificados"
        subtitle="Elige los ejercicios, imprime la hoja del estudiante y el solucionario por separado, y comparte un enlace para que cada estudiante los resuelva con corrección automática. No necesitas cuenta y no se guarda nada en ningún servidor."
      />

      <section aria-labelledby="armar" className="card space-y-4 p-5 print-hide">
        <h2 id="armar" className="font-display text-xl font-semibold">
          1. Elige la materia y los ejercicios
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectInput
            label="Materia"
            value={subjectId}
            options={subjects.map((m) => ({ value: m.id, label: m.nombre }))}
            onChange={changeSubject}
          />
          <TextInput label="Título del taller" value={title} onChange={setTitle} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">
            {chosen.length} de {list.length} elegidos
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setSelected(list.slice(0, ASSIGNMENT_LIMITS.maxExercises).map((e) => e.id))}
          >
            Elegir todos
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setSelected([])}
            disabled={chosen.length === 0}
          >
            Quitar todos
          </button>
        </div>
        <ul className="grid gap-2 md:grid-cols-2">
          {list.map((e) => (
            <li key={e.id}>
              <label className="card flex h-full cursor-pointer items-start gap-3 p-3.5">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 shrink-0 accent-red"
                  checked={selected.includes(e.id)}
                  onChange={() => toggle(e.id)}
                />
                <span className="min-w-0">
                  <span className="block text-sm leading-snug">{e.enunciado}</span>
                  <span className="mt-1 block text-xs text-muted">
                    {LEVEL[e.dificultad as 1 | 2 | 3]} · respuesta en {e.unidad}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      {chosen.length === 0 ? (
        <EmptyState icon="target" title="Elige al menos un ejercicio">
          El orden en que los marcas es el orden del taller.
        </EmptyState>
      ) : (
        <>
          <section aria-labelledby="compartir" className="card space-y-3 p-5 print-hide">
            <h2 id="compartir" className="font-display text-xl font-semibold">
              2. Imprime o comparte
            </h2>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary" onClick={() => print('estudiante')}>
                <Icon name="note" size={18} /> Imprimir hoja del estudiante
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => print('solucionario')}>
                <Icon name="check" size={18} /> Imprimir solucionario
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => void copyLink()}>
                <Icon name="copy" size={18} /> Copiar enlace para estudiantes
              </button>
              <AppLink to={path} className="btn btn-ghost">
                Probar el enlace
              </AppLink>
            </div>
            <p className="text-sm text-muted">
              El enlace lleva solo el título y la lista de ejercicios. Cada estudiante ve sus intentos en su
              propio dispositivo; ÁBACO no te envía resultados.
            </p>
          </section>

          <div
            className="flex gap-1 rounded-xl border border-line p-1 print-hide"
            role="tablist"
            aria-label="Vista previa"
          >
            {(['estudiante', 'solucionario'] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={sheet === s}
                onClick={() => setSheet(s)}
                className={`min-h-10 flex-1 rounded-lg px-3 text-sm font-semibold ${sheet === s ? 'bg-ink text-paper' : 'text-muted'}`}
              >
                {s === 'estudiante' ? 'Hoja del estudiante' : 'Solucionario'}
              </button>
            ))}
          </div>

          <article
            className="print-doc card space-y-6 p-6"
            aria-label={sheet === 'estudiante' ? 'Hoja del estudiante' : 'Solucionario'}
          >
            <header className="space-y-1 border-b border-line pb-4">
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">
                {subject?.nombre} ·{' '}
                {sheet === 'estudiante' ? 'Hoja del estudiante' : 'Solucionario para el docente'}
              </p>
              <h2 className="font-display text-2xl font-semibold">{heading}</h2>
              {sheet === 'estudiante' ? (
                <p className="pt-2 text-sm">Nombre: ______________________________ Fecha: ______________</p>
              ) : null}
            </header>
            <ol className="space-y-6">
              {chosen.map((e, i) => (
                <li key={e.id} className="break-inside-avoid space-y-2">
                  <p className="leading-relaxed">
                    <span className="font-semibold">{i + 1}.</span> {e.enunciado}
                  </p>
                  {sheet === 'estudiante' ? (
                    <p className="text-sm text-muted">Respuesta ({e.unidad}): ____________________</p>
                  ) : (
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="font-semibold">Respuesta:</span>{' '}
                        {formatAnswer(e.respuesta, e.unidad)}
                        {e.tolerancia > 0 ? (
                          <span className="text-muted">
                            {' '}
                            (se acepta ± {formatAnswer(e.tolerancia, e.unidad)})
                          </span>
                        ) : null}
                      </p>
                      <ol className="list-decimal space-y-1 pl-5">
                        {e.procedimiento.map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ol>
                      <SourceNote fuente={e.fuente} />
                    </div>
                  )}
                </li>
              ))}
            </ol>
            <footer className="border-t border-line pt-3 text-xs text-muted">
              Ejercicios de ÁBACO con respuesta verificada. Resuélvelos en línea: {location.origin}
              {location.pathname}#{path}
            </footer>
          </article>
        </>
      )}
    </div>
  );
}

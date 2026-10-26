import { useLiveQuery } from 'dexie-react-hooks';
import { useId, useRef, useState, type MouseEvent } from 'react';
import { listExams, saveExam } from '../../data/study-repositories';
import type { DocumentoPdf } from '../../data/types';
import type { Ejercicio, Materia, Temario } from '../../domain/content/schemas';
import {
  buildExam,
  gradeExam,
  type ExamResult,
  type ExamSource,
  type Question,
} from '../../domain/study/quiz';
import { Icon } from '../../ui/icons';
import { AppLink, Notice } from '../../ui/primitives';
import { formatDate } from '../../ui/utils';
import { useToast } from '../../ui/use-toast';
import { describePdf } from './describe';

const SIZES = [5, 10, 20] as const;
const SOURCE_LABEL: Record<ExamSource, string> = {
  abaco: 'Contenido de ÁBACO',
  pdf: 'Solo mi PDF',
  mixto: 'Mezclado',
};

function QuestionView({
  q,
  index,
  answer,
  onAnswer,
  graded,
}: {
  q: Question;
  index: number;
  answer: number | string | null;
  onAnswer: (value: number | string) => void;
  graded: boolean | null;
}) {
  const id = useId();
  return (
    <fieldset
      className={`card space-y-3 p-5 ${graded === true ? 'border-ok' : graded === false ? 'border-warn' : ''}`}
    >
      <legend className="sr-only">Pregunta {index + 1}</legend>
      <p className="flex items-start gap-2 font-semibold">
        <span className="tnum text-red">{index + 1}.</span>
        <span>{q.enunciado}</span>
      </p>
      {q.contexto ? (
        <blockquote className="rounded-xl bg-surface-2 p-3 text-sm text-ink-2">{q.contexto}</blockquote>
      ) : null}
      {q.tipo === 'opcion' ? (
        <div className="space-y-2">
          {q.opciones.map((op, i) => (
            <label
              key={op}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 text-sm hover:border-red"
            >
              <input
                type="radio"
                name={id}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--red)]"
                checked={answer === i}
                disabled={graded !== null}
                onChange={() => onAnswer(i)}
              />
              <span>{op}</span>
            </label>
          ))}
        </div>
      ) : (
        <label className="block max-w-xs" htmlFor={`${id}-n`}>
          <span className="mb-1 block text-sm font-semibold text-ink-2">Tu respuesta ({q.unidad})</span>
          <input
            id={`${id}-n`}
            className="field tnum"
            inputMode="decimal"
            value={typeof answer === 'string' ? answer : ''}
            disabled={graded !== null}
            onChange={(e) => onAnswer(e.target.value)}
          />
        </label>
      )}
      {graded !== null ? (
        <div className={`rounded-xl p-3 text-sm ${graded ? 'bg-ok-soft' : 'bg-warn-soft'}`}>
          <p className="font-semibold">
            {graded
              ? 'Correcto'
              : q.tipo === 'opcion'
                ? `Respuesta correcta: ${q.opciones[q.correcta]}`
                : `Respuesta correcta: ${q.respuesta} ${q.unidad}`}
          </p>
          <p className="mt-1 text-ink-2">{q.explicacion}</p>
          {q.ruta ? (
            <AppLink to={q.ruta} className="link-red mt-1 inline-block">
              Estudiar este tema →
            </AppLink>
          ) : null}
        </div>
      ) : null}
    </fieldset>
  );
}

export function ExamPanel({
  materia,
  temario,
  ejercicios,
  pdfs,
}: {
  materia: Materia;
  temario: Temario;
  ejercicios: Ejercicio[];
  pdfs: DocumentoPdf[];
}) {
  const toast = useToast();
  const id = useId();
  const usablePdfs = pdfs
    .map((pdf) => ({ pdf, defs: describePdf(pdf, materia, temario).definiciones }))
    .filter((x) => x.defs.length >= 4);
  const [fuente, setFuente] = useState<ExamSource>('abaco');
  const [pdfId, setPdfId] = useState('');
  const [cantidad, setCantidad] = useState<(typeof SIZES)[number]>(10);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, number | string | null>>({});
  const [result, setResult] = useState<ExamResult | null>(null);
  const started = useRef(0);
  const history = useLiveQuery(() => listExams(materia.id), [materia.id], []);

  const chosenPdf = usablePdfs.find((x) => x.pdf.id === pdfId) ?? usablePdfs[0];

  // Durations come from the click events' own timestamps (no clock reads during render).
  const start = (event: MouseEvent<HTMLButtonElement>) => {
    const qs = buildExam({
      materia,
      temario,
      ejercicios,
      fuente: chosenPdf ? fuente : 'abaco',
      cantidad,
      ...(chosenPdf ? { pdf: { nombre: chosenPdf.pdf.nombre, definiciones: chosenPdf.defs } } : {}),
    });
    setQuestions(qs);
    setAnswers({});
    setResult(null);
    started.current = event.timeStamp;
  };

  const grade = async (event: MouseEvent<HTMLButtonElement>) => {
    if (!questions) return;
    const r = gradeExam(questions, answers);
    setResult(r);
    try {
      await saveExam({
        materiaId: materia.id,
        fuentes: chosenPdf ? fuente : 'abaco',
        total: r.total,
        correctas: r.correctas,
        segundos: Math.max(0, Math.round((event.timeStamp - started.current) / 1000)),
      });
    } catch (error) {
      toast.error(error);
    }
  };

  const answered = questions
    ? questions.filter((q) => answers[q.id] !== undefined && answers[q.id] !== '').length
    : 0;

  return (
    <section aria-labelledby={`${id}-t`} className="space-y-5">
      <div className="card space-y-4 p-5">
        <h2 id={`${id}-t`} className="font-display text-xl font-semibold">
          Examen de práctica
        </h2>
        <p className="text-sm text-ink-2">
          Preguntas armadas con la teoría, los ejemplos, los puntos clave, los errores frecuentes y los
          ejercicios de {materia.nombre}, y con las definiciones que encontramos en tu PDF. Al calificar verás
          la respuesta correcta y dónde estudiarla.
        </p>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink-2">Preguntas de</legend>
          <div className="flex flex-wrap gap-2">
            {(['abaco', 'pdf', 'mixto'] as const).map((f) => {
              const disabled = f !== 'abaco' && usablePdfs.length === 0;
              return (
                <label
                  key={f}
                  className={`chip min-h-10 ${disabled ? 'opacity-50' : 'cursor-pointer'} ${fuente === f && !disabled ? 'border-red bg-red-soft text-red' : ''}`}
                >
                  <input
                    type="radio"
                    name={`${id}-src`}
                    className="sr-only"
                    checked={fuente === f}
                    disabled={disabled}
                    onChange={() => setFuente(f)}
                  />
                  {SOURCE_LABEL[f]}
                </label>
              );
            })}
          </div>
          {usablePdfs.length === 0 ? (
            <p className="mt-2 text-xs text-muted">
              Para preguntas de tu PDF, agrega uno con al menos 4 definiciones claras («X es…», «X se define
              como…»).
            </p>
          ) : null}
        </fieldset>
        {fuente !== 'abaco' && usablePdfs.length > 1 ? (
          <label className="block max-w-md" htmlFor={`${id}-pdf`}>
            <span className="mb-1 block text-sm font-semibold text-ink-2">PDF</span>
            <select
              id={`${id}-pdf`}
              className="field"
              value={chosenPdf?.pdf.id ?? ''}
              onChange={(e) => setPdfId(e.target.value)}
            >
              {usablePdfs.map((x) => (
                <option key={x.pdf.id} value={x.pdf.id}>
                  {x.pdf.nombre}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink-2">Número de preguntas</legend>
          <div className="flex flex-wrap gap-2">
            {SIZES.map((n) => (
              <label
                key={n}
                className={`chip min-h-10 cursor-pointer ${cantidad === n ? 'border-red bg-red-soft text-red' : ''}`}
              >
                <input
                  type="radio"
                  name={`${id}-n`}
                  className="sr-only"
                  checked={cantidad === n}
                  onChange={() => setCantidad(n)}
                />
                {n}
              </label>
            ))}
          </div>
        </fieldset>
        <button type="button" className="btn btn-primary" onClick={start}>
          <Icon name="target" size={18} /> {questions ? 'Nuevo examen' : 'Empezar examen'}
        </button>
      </div>

      {questions ? (
        <div className="space-y-4">
          {result ? (
            <div role="status" className="card flex flex-wrap items-center gap-4 p-5">
              <span className="tnum font-display text-4xl font-semibold text-red">{result.porcentaje} %</span>
              <span className="text-ink-2">
                {result.correctas} de {result.total} correctas. Revisa abajo cada respuesta y su explicación.
              </span>
            </div>
          ) : null}
          {questions.map((q, i) => (
            <QuestionView
              key={q.id}
              q={q}
              index={i}
              answer={answers[q.id] ?? null}
              onAnswer={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
              graded={result ? (result.detalle[i]?.correcta ?? false) : null}
            />
          ))}
          {!result ? (
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="btn btn-primary" onClick={(e) => void grade(e)}>
                <Icon name="check" size={18} /> Calificar
              </button>
              <span className="text-sm text-muted">
                Respondidas: {answered} de {questions.length}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      {history.length > 0 ? (
        <div className="card p-5">
          <h3 className="mb-2 font-semibold">Tus últimos exámenes de {materia.nombre}</h3>
          <ul className="space-y-1 text-sm text-ink-2">
            {history.slice(0, 5).map((e) => (
              <li key={e.id} className="tnum">
                {formatDate(e.fecha)} · {SOURCE_LABEL[e.fuentes]} · {e.correctas}/{e.total} (
                {Math.round((e.correctas / e.total) * 100)} %)
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {questions && questions.length < cantidad ? (
        <Notice>
          Hay menos preguntas que las pedidas porque la fuente elegida no da para más; prueba con «Mezclado» o
          «Contenido de ÁBACO».
        </Notice>
      ) : null}
    </section>
  );
}

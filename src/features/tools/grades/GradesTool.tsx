import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { materias } from '../../../data/content';
import { countUsage, getCalificacion, saveCalificacion } from '../../../data/everyday-repositories';
import type { Calificacion } from '../../../data/types';
import { neededGrade, type GradeOutcome } from '../../../domain/grades/needed';
import type { ToolInfo } from '../../../domain/tools/catalog';
import { Icon } from '../../../ui/icons';
import { useProfile } from '../../../ui/use-profile';
import { NumberField, ToolLayout } from '../ToolLayout';
import { num, readNumber } from '../format';

interface Row {
  id: string;
  nombre: string;
  peso: string;
  nota: string;
}

interface Form {
  notaMaxima: string;
  objetivo: string;
  rows: Row[];
}

const SCALES = ['10', '20', '100'];

/** "2026-1" from January to June and "2026-2" from July: just a default label, the student can change it. */
function defaultPeriod(date = new Date()): string {
  return `${date.getFullYear()}-${date.getMonth() < 6 ? 1 : 2}`;
}

const emptyRow = (): Row => ({ id: crypto.randomUUID(), nombre: '', peso: '', nota: '' });

function toForm(saved: Calificacion | null): Form {
  if (!saved) return { notaMaxima: '10', objetivo: '7', rows: [emptyRow(), emptyRow()] };
  return {
    notaMaxima: String(saved.notaMaxima),
    objetivo: num(saved.objetivo),
    rows: saved.componentes.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      peso: num(c.peso),
      nota: c.nota === null ? '' : num(c.nota),
    })),
  };
}

function Result({
  outcome,
  notaMaxima,
  objetivo,
}: {
  outcome: GradeOutcome;
  notaMaxima: number;
  objetivo: number;
}) {
  if (outcome.estado === 'invalido') {
    return (
      <div role="status" className="card border-warn/40 bg-warn-soft p-5 text-sm text-ink-2">
        <p className="font-semibold text-ink">Revisa estos datos</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {outcome.errores.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </div>
    );
  }
  const scale = `sobre ${num(notaMaxima)}`;
  const headline = {
    necesita: outcome.estado === 'necesita' ? `${num(outcome.necesaria)}` : '',
    asegurado: 'Ya pasaste',
    imposible: 'Ya no alcanza',
    aprobado: 'Aprobada',
    reprobado: 'No alcanzó',
  }[outcome.estado];
  const tone =
    outcome.estado === 'imposible' || outcome.estado === 'reprobado'
      ? 'text-warn'
      : outcome.estado === 'necesita'
        ? 'text-ink'
        : 'text-ok';
  return (
    <div role="status" className="card space-y-4 p-5">
      <div>
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">
          {outcome.estado === 'necesita' ? 'Necesitas en promedio en lo que falta' : 'Resultado'}
        </p>
        <p className={`tnum mt-1 font-display text-4xl font-semibold ${tone}`}>
          {headline}
          {outcome.estado === 'necesita' ? (
            <span className="text-lg font-normal text-muted"> {scale}</span>
          ) : null}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">
          {outcome.estado === 'necesita'
            ? `Con ese promedio en el ${num(outcome.pesoPendiente)} % que falta llegas a ${num(objetivo)}. Llevas ${num(outcome.acumulado)} puntos y lo máximo que aún puedes alcanzar es ${num(outcome.maximoPosible)}.`
            : outcome.estado === 'asegurado'
              ? `Llevas ${num(outcome.acumulado)} puntos: aunque saques 0 en el ${num(outcome.pesoPendiente)} % que falta, tu nota final será al menos ${num(outcome.acumulado)} ${scale}.`
              : outcome.estado === 'imposible'
                ? `Aun con ${num(notaMaxima)} en todo lo que falta, llegarías a ${num(outcome.maximoPosible)} ${scale}, menos que ${num(objetivo)}. Pregunta a tu docente si tu universidad tiene examen de recuperación o supletorio.`
                : `Tu nota final es ${num(outcome.final)} ${scale} (sin redondear hacia arriba).`}
        </p>
      </div>
      <div className="border-t border-line pt-3">
        <h3 className="eyebrow mb-2">Procedimiento</h3>
        <ol className="tnum space-y-1 text-sm text-ink-2">
          {outcome.pasos.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Editor({
  materiaId,
  periodo,
  saved,
}: {
  materiaId: string;
  periodo: string;
  saved: Calificacion | null;
}) {
  const [form, setForm] = useState<Form>(() => toForm(saved));
  const dirty = useRef(false);
  const counted = useRef(false);
  const [status, setStatus] = useState('');

  const notaMaxima = readNumber(form.notaMaxima) ?? Number.NaN;
  const objetivo = readNumber(form.objetivo) ?? Number.NaN;
  const componentes = form.rows.map((r) => ({
    nombre: r.nombre,
    peso: readNumber(r.peso) ?? Number.NaN,
    nota: r.nota.trim() === '' ? null : (readNumber(r.nota) ?? Number.NaN),
  }));
  const outcome = neededGrade({ componentes, notaMaxima, objetivo });
  const totalPeso = componentes.reduce((sum, c) => sum + (Number.isFinite(c.peso) ? c.peso : 0), 0);

  useEffect(() => {
    if (!dirty.current || !(notaMaxima > 0)) return;
    const timer = window.setTimeout(() => {
      void saveCalificacion({
        materiaId,
        periodo,
        notaMaxima,
        objetivo: Number.isFinite(objetivo) ? objetivo : 0,
        componentes: form.rows.map((r, i) => ({
          id: r.id,
          nombre: r.nombre,
          peso: componentes[i]?.peso ?? 0,
          nota: componentes[i]?.nota ?? null,
        })),
      })
        .then(() => {
          setStatus('Guardado en este dispositivo.');
          if (!counted.current) {
            counted.current = true;
            void countUsage('calculo-notas');
          }
        })
        .catch((e: Error) => setStatus(e.message));
    }, 400);
    return () => window.clearTimeout(timer);
    // componentes and the numbers are derived from form: saving on form changes is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, materiaId, periodo]);

  const update = (next: (f: Form) => Form) => {
    dirty.current = true;
    setForm(next);
  };
  const setRow = (id: string, field: keyof Omit<Row, 'id'>) => (value: string) =>
    update((f) => ({ ...f, rows: f.rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)) }));

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="card space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink-2">Escala de notas</span>
            <select
              className="field"
              value={SCALES.includes(form.notaMaxima) ? form.notaMaxima : 'otra'}
              onChange={(e) =>
                update((f) => ({ ...f, notaMaxima: e.target.value === 'otra' ? '' : e.target.value }))
              }
            >
              {SCALES.map((s) => (
                <option key={s} value={s}>
                  Sobre {s}
                </option>
              ))}
              <option value="otra">Otra</option>
            </select>
          </label>
          {SCALES.includes(form.notaMaxima) ? (
            <NumberField
              id="notas-objetivo"
              label="Nota que quieres alcanzar"
              value={form.objetivo}
              onChange={(v) => update((f) => ({ ...f, objetivo: v }))}
              hint="Normalmente la nota mínima para aprobar; cámbiala si tu universidad usa otra."
            />
          ) : (
            <NumberField
              id="notas-maxima"
              label="Nota máxima de tu escala"
              value={form.notaMaxima}
              onChange={(v) => update((f) => ({ ...f, notaMaxima: v }))}
            />
          )}
        </div>
        {!SCALES.includes(form.notaMaxima) ? (
          <NumberField
            id="notas-objetivo-otra"
            label="Nota que quieres alcanzar"
            value={form.objetivo}
            onChange={(v) => update((f) => ({ ...f, objetivo: v }))}
          />
        ) : null}

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-ink-2">
            Componentes de evaluación{' '}
            <span
              className={`tnum font-normal ${Math.abs(totalPeso - 100) > 0.01 ? 'text-warn' : 'text-ok'}`}
            >
              (pesos: {num(totalPeso)} % de 100 %)
            </span>
          </legend>
          <p className="text-xs text-muted">
            Escribe cada parte de la nota con el peso que puso tu docente. Deja la nota vacía si todavía no la
            tienes.
          </p>
          {form.rows.map((r, i) => (
            <div key={r.id} className="grid grid-cols-[1fr_5.5rem_5.5rem_auto] items-end gap-2">
              <label className="block min-w-0">
                <span className="mb-1 block text-xs font-semibold text-muted">Componente {i + 1}</span>
                <input
                  className="field"
                  value={r.nombre}
                  maxLength={60}
                  placeholder={i === 0 ? 'Primer parcial' : 'Examen final'}
                  onChange={(e) => setRow(r.id, 'nombre')(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted">Peso %</span>
                <input
                  className="field tnum"
                  inputMode="decimal"
                  value={r.peso}
                  maxLength={8}
                  aria-label={`Peso del componente ${i + 1}`}
                  onChange={(e) => setRow(r.id, 'peso')(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted">Nota</span>
                <input
                  className="field tnum"
                  inputMode="decimal"
                  value={r.nota}
                  maxLength={8}
                  placeholder="—"
                  aria-label={`Nota del componente ${i + 1}`}
                  onChange={(e) => setRow(r.id, 'nota')(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="btn btn-ghost min-h-11 px-3"
                aria-label={`Quitar el componente ${i + 1}`}
                onClick={() => update((f) => ({ ...f, rows: f.rows.filter((x) => x.id !== r.id) }))}
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-ghost"
            disabled={form.rows.length >= 30}
            onClick={() => update((f) => ({ ...f, rows: [...f.rows, emptyRow()] }))}
          >
            <Icon name="plus" size={16} /> Agregar componente
          </button>
        </fieldset>
        <p className="text-xs text-muted" aria-live="polite">
          {status}
        </p>
      </div>
      <Result outcome={outcome} notaMaxima={notaMaxima} objetivo={objetivo} />
    </div>
  );
}

export default function GradesTool({ tool }: { tool: ToolInfo }) {
  const profile = useProfile();
  const ordered = [
    ...materias.filter((m) => profile.materias.includes(m.id)),
    ...materias.filter((m) => !profile.materias.includes(m.id)),
  ];
  const [materiaId, setMateriaId] = useState<string>('');
  const [periodo, setPeriodo] = useState(defaultPeriod);
  const selected = materiaId || ordered[0]?.id || '';
  const saved = useLiveQuery(
    async () => (await getCalificacion(selected, periodo.trim())) ?? null,
    [selected, periodo],
  );

  return (
    <ToolLayout
      tool={tool}
      metodo={
        <>
          <p>
            Nota final = suma de cada nota por su peso. Lo que necesitas en lo pendiente = (nota que quieres −
            lo que ya llevas) ÷ peso pendiente. La necesaria se redondea hacia arriba al centavo, para que
            alcanzarla siempre sea suficiente, y la nota final se muestra sin redondear hacia arriba.
          </p>
          <p>
            ÁBACO no trae pesos ni notas mínimas: cada docente y cada universidad usan los suyos, por eso los
            escribes tú. Se guardan solo en este dispositivo, por materia y período.
          </p>
        </>
      }
    >
      <div className="card grid gap-4 p-5 sm:grid-cols-[1fr_12rem]">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-ink-2">Materia</span>
          <select className="field" value={selected} onChange={(e) => setMateriaId(e.target.value)}>
            {ordered.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-ink-2">Período</span>
          <input
            className="field"
            value={periodo}
            maxLength={30}
            onChange={(e) => setPeriodo(e.target.value)}
          />
        </label>
      </div>
      {saved === undefined || !periodo.trim() ? null : (
        <Editor
          key={`${selected}|${periodo.trim()}`}
          materiaId={selected}
          periodo={periodo.trim()}
          saved={saved}
        />
      )}
    </ToolLayout>
  );
}

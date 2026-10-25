import { m } from 'motion/react';
import { useMemo, useState } from 'react';
import type { Formula } from '../../domain/content/schemas';
import { calculate, parseNumberInput, parseNumberList } from '../../domain/formula/calculator';
import { Icon } from '../../ui/icons';
import { formatNumber as fmt } from './format';
import { MathFormula } from './MathFormula';

export default function Calculator({ formula, math }: { formula: Formula; math: Record<string, string> }) {
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
                <MathFormula latex={v.simbolo} html={math[`I:${v.simbolo}`]} display={false} /> <span className="font-normal text-muted">{v.significado}</span>
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

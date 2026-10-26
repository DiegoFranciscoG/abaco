import { useMemo, useState } from 'react';
import type { ToolInfo } from '../../../domain/tools/catalog';
import { compile, derivative, extrema, roots, sample } from '../../../domain/tools/plot';
import { LineChart } from '../../../ui/charts';
import { NumberField, ToolLayout } from '../ToolLayout';
import { num, readNumber } from '../format';

const EXAMPLES = [
  { label: 'Ingreso cuadrático', f: 'x*(100 - 2x)' },
  { label: 'Costo total', f: '500 + 20x + 0,1x^2' },
  { label: 'Crecimiento compuesto', f: '1000*(1 + 0,08)^x' },
  { label: 'Logaritmo', f: 'ln(x)' },
];

export default function PlotterTool({ tool }: { tool: ToolInfo }) {
  const [expr, setExpr] = useState('x*(100 - 2x)');
  const [xminText, setXmin] = useState('0');
  const [xmaxText, setXmax] = useState('50');
  const [x0Text, setX0] = useState('10');
  const [showDerivative, setShowDerivative] = useState(true);

  const compiled = useMemo(() => compile(expr), [expr]);
  const xmin = readNumber(xminText);
  const xmax = readNumber(xmaxText);
  const x0 = readNumber(x0Text);

  let error = compiled.ok ? '' : compiled.message;
  if (!error && (xmin === null || xmax === null || !(xmax > xmin)))
    error = 'El extremo derecho debe ser mayor que el izquierdo.';
  if (!error && xmax !== null && xmin !== null && xmax - xmin > 1e7)
    error = 'El intervalo es demasiado amplio.';

  const analysis = useMemo(() => {
    if (!compiled.ok || xmin === null || xmax === null || !(xmax > xmin) || xmax - xmin > 1e7) return null;
    const f = compiled.f;
    const points = sample(f, xmin, xmax);
    const deriv = sample((x) => derivative(f, x), xmin, xmax, 160);
    return { points, deriv, roots: roots(f, xmin, xmax), extremes: extrema(f, xmin, xmax) };
  }, [compiled, xmin, xmax]);

  const f0 = compiled.ok && x0 !== null ? compiled.f(x0) : null;
  const slope = compiled.ok && x0 !== null ? derivative(compiled.f, x0) : null;
  const tangent =
    analysis && f0 !== null && slope !== null && x0 !== null && xmin !== null && xmax !== null
      ? [
          { x: xmin, y: f0 + slope * (xmin - x0) },
          { x: xmax, y: f0 + slope * (xmax - x0) },
        ]
      : null;

  return (
    <ToolLayout
      tool={tool}
      metodo={
        <>
          <p>
            La expresión pasa por el mismo analizador seguro de las fórmulas: solo acepta la variable x,
            números, operadores y funciones conocidas (raiz, ln, log, exp, abs); nunca se ejecuta como código.
          </p>
          <p>
            La derivada se aproxima con la diferencia central [f(x + h) − f(x − h)] ÷ 2h, la idea de la
            derivada como límite del cociente de diferencias (OpenStax, Cálculo volumen 1, 3.1). Raíces y
            extremos se buscan con cambios de signo de f y de f′ en una cuadrícula fina de puntos, refinados
            por bisección: una raíz doble que solo toca el eje puede no detectarse.
          </p>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.7fr]">
        <div className="card space-y-4 p-5">
          <label className="block" htmlFor="gf-expr">
            <span className="mb-1 block text-sm font-semibold text-ink-2">f(x) =</span>
            <input
              id="gf-expr"
              className="field font-mono"
              value={expr}
              onChange={(e) => setExpr(e.target.value)}
              maxLength={200}
              spellCheck={false}
              autoComplete="off"
            />
            <span className="mt-1 block text-xs text-muted">
              Escribe como en el cuaderno: 2x^2 - 3x + 1, e^(0,05x), raiz(x).
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((e) => (
              <button key={e.label} type="button" className="chip min-h-9" onClick={() => setExpr(e.f)}>
                {e.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField id="gf-min" label="x desde" value={xminText} onChange={setXmin} />
            <NumberField id="gf-max" label="x hasta" value={xmaxText} onChange={setXmax} />
          </div>
          <NumberField id="gf-x0" label="Recta tangente en x =" value={x0Text} onChange={setX0} />
          <label className="flex items-center gap-3 text-sm font-semibold text-ink-2">
            <input
              type="checkbox"
              className="h-5 w-5 accent-[var(--red)]"
              checked={showDerivative}
              onChange={(e) => setShowDerivative(e.target.checked)}
            />
            Mostrar la derivada f′(x)
          </label>
        </div>
        <div className="space-y-4" aria-live="polite">
          {error ? <p className="text-sm font-semibold text-warn">{error}</p> : null}
          {analysis && !error ? (
            <>
              <LineChart
                title={`f(x) = ${expr}`}
                summary={`Raíces: ${analysis.roots.length ? analysis.roots.map((r) => num(r, 4)).join(', ') : 'ninguna en el intervalo'}. ${analysis.extremes.map((e) => `${e.tipo === 'maximo' ? 'Máximo' : 'Mínimo'} en x = ${num(e.x, 4)}`).join('. ')}`}
                xLabel="x"
                series={[
                  { name: 'f(x)', points: analysis.points },
                  ...(showDerivative
                    ? [{ name: 'f′(x)', points: analysis.deriv, dashed: true, color: 'var(--chart-3)' }]
                    : []),
                  ...(tangent
                    ? [{ name: `Tangente en x = ${num(x0 ?? 0)}`, points: tangent, color: 'var(--chart-2)' }]
                    : []),
                ]}
                markers={[
                  ...analysis.roots.map((r) => ({ x: r, y: 0, label: `raiz${r}` })),
                  ...analysis.extremes.map((e) => ({ x: e.x, y: e.y, label: `ext${e.x}` })),
                ]}
                table={{
                  columns: ['x', 'f(x)'],
                  rows: analysis.points
                    .filter((_, i) => i % 12 === 0)
                    .map((p) => [p.x, p.y === null ? 'no definida' : p.y]),
                }}
              />
              <dl className="grid gap-3 sm:grid-cols-3">
                <div className="card p-4">
                  <dt className="text-xs font-semibold tracking-wide text-muted uppercase">Raíces</dt>
                  <dd className="tnum mt-1">
                    {analysis.roots.length
                      ? analysis.roots.map((r) => num(r, 4)).join('; ')
                      : 'Ninguna en el intervalo'}
                  </dd>
                </div>
                <div className="card p-4">
                  <dt className="text-xs font-semibold tracking-wide text-muted uppercase">
                    Máximos y mínimos
                  </dt>
                  <dd className="tnum mt-1">
                    {analysis.extremes.length
                      ? analysis.extremes
                          .map(
                            (e) => `${e.tipo === 'maximo' ? 'máx' : 'mín'} (${num(e.x, 4)}; ${num(e.y, 4)})`,
                          )
                          .join(' · ')
                      : 'Ninguno en el intervalo'}
                  </dd>
                </div>
                <div className="card p-4">
                  <dt className="text-xs font-semibold tracking-wide text-muted uppercase">
                    En x = {num(x0 ?? 0)}
                  </dt>
                  <dd className="tnum mt-1">
                    f = {f0 === null ? 'no definida' : num(f0, 4)} · f′ ={' '}
                    {slope === null ? '—' : num(slope, 4)}
                  </dd>
                </div>
              </dl>
            </>
          ) : null}
        </div>
      </div>
    </ToolLayout>
  );
}

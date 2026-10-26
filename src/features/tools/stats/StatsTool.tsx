import { useState } from 'react';
import type { ToolInfo } from '../../../domain/tools/catalog';
import {
  boxPlot,
  describe,
  histogram,
  meanInterval,
  oneSampleT,
  parseData,
  proportionInterval,
  regression,
  sampleSize,
} from '../../../domain/tools/stats';
import { formatTick } from '../../../ui/chart-scale';
import { BarChart, LineChart } from '../../../ui/charts';
import { Tabs } from '../../../ui/primitives';
import { NumberField, Stat, ToolLayout } from '../ToolLayout';
import { num, pct, readNumber } from '../format';

type Mode = 'describir' | 'inferir' | 'regresion' | 'muestra';

const SAMPLE = '12\n15\n11\n18\n14\n16\n13\n22\n15\n17\n14\n19';

function DataInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-1 block text-sm font-semibold text-ink-2">{label}</span>
      <textarea
        id={id}
        className="field tnum min-h-40"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={20_000}
      />
      <span className="mt-1 block text-xs text-muted">
        Un dato por línea, o separados por punto y coma. Coma o punto decimal.
      </span>
    </label>
  );
}

function BoxPlotSvg({ values }: { values: number[] }) {
  const b = boxPlot(values);
  const min = Math.min(b.bigoteInferior, ...b.atipicos);
  const max = Math.max(b.bigoteSuperior, ...b.atipicos);
  const span = max - min || 1;
  const sx = (v: number) => 30 + ((v - min) / span) * 580;
  return (
    <figure className="card p-4">
      <figcaption className="mb-2 text-sm font-semibold">Diagrama de caja</figcaption>
      <svg
        viewBox="0 0 640 110"
        className="h-auto w-full"
        role="img"
        aria-label={`Diagrama de caja: Q1 ${formatTick(b.q1)}, mediana ${formatTick(b.mediana)}, Q3 ${formatTick(b.q3)}, bigotes de ${formatTick(b.bigoteInferior)} a ${formatTick(b.bigoteSuperior)}, ${b.atipicos.length} valores atípicos.`}
      >
        <line x1={sx(b.bigoteInferior)} x2={sx(b.q1)} y1={50} y2={50} stroke="var(--ink-2)" strokeWidth={2} />
        <line x1={sx(b.q3)} x2={sx(b.bigoteSuperior)} y1={50} y2={50} stroke="var(--ink-2)" strokeWidth={2} />
        <line
          x1={sx(b.bigoteInferior)}
          x2={sx(b.bigoteInferior)}
          y1={38}
          y2={62}
          stroke="var(--ink-2)"
          strokeWidth={2}
        />
        <line
          x1={sx(b.bigoteSuperior)}
          x2={sx(b.bigoteSuperior)}
          y1={38}
          y2={62}
          stroke="var(--ink-2)"
          strokeWidth={2}
        />
        <rect
          x={sx(b.q1)}
          y={28}
          width={Math.max(2, sx(b.q3) - sx(b.q1))}
          height={44}
          rx={6}
          fill="var(--red-soft)"
          stroke="var(--red)"
          strokeWidth={2}
        />
        <line x1={sx(b.mediana)} x2={sx(b.mediana)} y1={28} y2={72} stroke="var(--red)" strokeWidth={3} />
        {b.atipicos.map((v, i) => (
          <circle
            key={`${v}-${i}`}
            cx={sx(v)}
            cy={50}
            r={5}
            fill="var(--surface)"
            stroke="var(--warn)"
            strokeWidth={2}
          />
        ))}
        {[b.bigoteInferior, b.q1, b.mediana, b.q3, b.bigoteSuperior].map((v, i) => (
          <text key={i} x={sx(v)} y={96} textAnchor="middle" className="fill-[var(--muted)] text-[11px]">
            {formatTick(v)}
          </text>
        ))}
      </svg>
      {b.atipicos.length > 0 ? (
        <p className="mt-1 text-xs text-muted">
          Atípicos (fuera de 1,5 × RIC): {b.atipicos.map((v) => formatTick(v)).join('; ')}
        </p>
      ) : null}
    </figure>
  );
}

function Describe() {
  const [text, setText] = useState(SAMPLE);
  const { values, ignored } = parseData(text);
  let error = '';
  let d: ReturnType<typeof describe> | null = null;
  try {
    d = describe(values);
  } catch (e) {
    error = (e as Error).message;
  }
  const bins = d ? histogram(values) : [];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.7fr]">
      <div className="space-y-2">
        <DataInput id="st-datos" label="Datos" value={text} onChange={setText} />
        {ignored.length > 0 ? <p className="text-xs text-warn">Se ignoraron: {ignored.join(', ')}</p> : null}
      </div>
      <div className="space-y-4" aria-live="polite">
        {error ? <p className="text-sm font-semibold text-warn">{error}</p> : null}
        {d ? (
          <>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="n" value={String(d.n)} />
              <Stat label="Media" value={num(d.media, 4)} />
              <Stat label="Mediana" value={num(d.mediana, 4)} />
              <Stat label="Moda" value={d.moda.length ? d.moda.map((m) => num(m)).join('; ') : 'Sin moda'} />
              <Stat label="Desviación (s)" value={num(d.desviacion, 4)} />
              <Stat label="Varianza (s²)" value={num(d.varianza, 4)} />
              <Stat
                label="Coef. de variación"
                value={d.coeficienteVariacion === null ? '—' : pct(d.coeficienteVariacion)}
              />
              <Stat label="Asimetría" value={d.asimetria === null ? '—' : num(d.asimetria, 3)} />
              <Stat label="Mínimo" value={num(d.minimo)} />
              <Stat label="Q1" value={num(d.q1, 4)} />
              <Stat label="Q3" value={num(d.q3, 4)} />
              <Stat label="Máximo" value={num(d.maximo)} />
            </dl>
            <BarChart
              title="Histograma (clases por regla de Sturges)"
              summary={`${bins.length} clases; la más frecuente tiene ${Math.max(...bins.map((b) => b.frecuencia))} datos.`}
              xLabel="Clases"
              bars={bins.map((b, i) => ({
                label: `${formatTick(b.desde)}–${formatTick(b.hasta)}${i === bins.length - 1 ? ']' : ')'}`,
                value: b.frecuencia,
              }))}
            />
            <BoxPlotSvg values={values} />
          </>
        ) : null}
      </div>
    </div>
  );
}

function Infer() {
  const [text, setText] = useState(SAMPLE);
  const [confianza, setConfianza] = useState('95');
  const [mu0, setMu0] = useState('15');
  const [alt, setAlt] = useState<'distinta' | 'mayor' | 'menor'>('distinta');
  const [exitos, setExitos] = useState('120');
  const [n, setN] = useState('300');
  const { values } = parseData(text);
  const c = readNumber(confianza);
  const m0 = readNumber(mu0);
  const k = readNumber(exitos);
  const total = readNumber(n);
  let meanCi: ReturnType<typeof meanInterval> | null = null;
  let test: ReturnType<typeof oneSampleT> | null = null;
  let prop: ReturnType<typeof proportionInterval> | null = null;
  const errors: string[] = [];
  try {
    if (c !== null) meanCi = meanInterval(values, c / 100);
    if (c !== null && m0 !== null) test = oneSampleT(values, m0, 1 - c / 100, alt);
  } catch (e) {
    errors.push((e as Error).message);
  }
  try {
    if (c !== null && k !== null && total !== null) prop = proportionInterval(k, total, c / 100);
  } catch (e) {
    errors.push((e as Error).message);
  }
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.7fr]">
        <div className="space-y-4">
          <DataInput id="inf-datos" label="Datos de la muestra" value={text} onChange={setText} />
          <NumberField
            id="inf-conf"
            label="Nivel de confianza"
            value={confianza}
            onChange={setConfianza}
            suffix="%"
          />
        </div>
        <div className="space-y-4" aria-live="polite">
          {errors.map((e) => (
            <p key={e} className="text-sm font-semibold text-warn">
              {e}
            </p>
          ))}
          {meanCi ? (
            <section className="card space-y-2 p-5">
              <h3 className="font-semibold">Intervalo de confianza para la media (t de Student)</h3>
              <p className="tnum text-2xl font-display font-semibold">
                [{num(meanCi.inferior, 4)} ; {num(meanCi.superior, 4)}]
              </p>
              <p className="text-sm text-muted">
                x̄ ± t·s/√n con t = {num(meanCi.critico, 4)} y {values.length - 1} grados de libertad; margen
                de error {num(meanCi.margen, 4)}.
              </p>
            </section>
          ) : null}
          {test ? (
            <section className="card space-y-3 p-5">
              <h3 className="font-semibold">Prueba t para una media</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <NumberField id="inf-mu0" label="Valor de H₀ (μ₀)" value={mu0} onChange={setMu0} />
                <label className="block" htmlFor="inf-alt">
                  <span className="mb-1 block text-sm font-semibold text-ink-2">Hipótesis alternativa</span>
                  <select
                    id="inf-alt"
                    className="field"
                    value={alt}
                    onChange={(e) => setAlt(e.target.value as typeof alt)}
                  >
                    <option value="distinta">μ ≠ μ₀ (dos colas)</option>
                    <option value="mayor">μ &gt; μ₀</option>
                    <option value="menor">μ &lt; μ₀</option>
                  </select>
                </label>
              </div>
              <p className="text-sm">
                t = <strong className="tnum">{num(test.t, 4)}</strong> · valor p ={' '}
                <strong className="tnum">{num(test.valorP, 4)}</strong> · α = {num(1 - (c ?? 95) / 100, 3)}
              </p>
              <p className={`text-sm font-semibold ${test.rechaza ? 'text-red' : 'text-ink-2'}`}>
                {test.rechaza
                  ? 'Se rechaza H₀: hay evidencia a favor de la alternativa.'
                  : 'No se rechaza H₀: los datos no dan evidencia suficiente.'}
              </p>
            </section>
          ) : null}
        </div>
      </div>
      <section className="card space-y-4 p-5">
        <h3 className="font-semibold">Intervalo de confianza para una proporción</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField id="inf-exitos" label="Éxitos (respuestas «sí»)" value={exitos} onChange={setExitos} />
          <NumberField id="inf-n" label="Tamaño de la muestra (n)" value={n} onChange={setN} />
        </div>
        {prop ? (
          <p className="tnum text-lg" aria-live="polite">
            p̂ = {pct(prop.p)} · intervalo [{pct(prop.inferior)} ; {pct(prop.superior)}] · margen ±
            {pct(prop.margen)}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function Regression() {
  const [xs, setXs] = useState('1\n2\n3\n4\n5\n6');
  const [ys, setYs] = useState('2,1\n3,9\n6,2\n7,8\n10,1\n12,2');
  const x = parseData(xs).values;
  const y = parseData(ys).values;
  let error = '';
  let r: ReturnType<typeof regression> | null = null;
  try {
    r = regression(x, y);
  } catch (e) {
    error = (e as Error).message;
  }
  const minX = Math.min(...x);
  const maxX = Math.max(...x);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.7fr]">
      <div className="grid grid-cols-2 gap-3">
        <DataInput id="rg-x" label="X" value={xs} onChange={setXs} />
        <DataInput id="rg-y" label="Y" value={ys} onChange={setYs} />
      </div>
      <div className="space-y-4" aria-live="polite">
        {error ? <p className="text-sm font-semibold text-warn">{error}</p> : null}
        {r ? (
          <>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Pendiente b" value={num(r.b, 4)} />
              <Stat label="Intersección a" value={num(r.a, 4)} />
              <Stat label="r de Pearson" value={num(r.r, 4)} />
              <Stat label="r²" value={num(r.r2, 4)} />
            </dl>
            <p className="tnum text-lg">
              ŷ = {num(r.a, 4)} {r.b >= 0 ? '+' : '−'} {num(Math.abs(r.b), 4)}·x
            </p>
            <LineChart
              title="Datos y recta de mínimos cuadrados"
              summary={`La recta ŷ = ${num(r.a, 3)} + ${num(r.b, 3)}x explica el ${pct(r.r2, 1)} de la variación de Y.`}
              xLabel="X"
              yLabel="Y"
              series={[
                {
                  name: 'Recta de regresión',
                  points: [
                    { x: minX, y: r.a + r.b * minX },
                    { x: maxX, y: r.a + r.b * maxX },
                  ],
                },
              ]}
              markers={x.map((xi, i) => ({ x: xi, y: y[i] as number, label: `p${i}` }))}
              table={{
                columns: ['X', 'Y', 'ŷ', 'Residuo'],
                rows: x.map((xi, i) => [
                  xi,
                  y[i] as number,
                  r.a + r.b * xi,
                  (y[i] as number) - (r.a + r.b * xi),
                ]),
              }}
            />
            <p className="text-xs text-muted">
              Una correlación alta no prueba que X cause Y. Predecir fuera del rango de X (extrapolar) no es
              confiable.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}

function SampleSize() {
  const [conf, setConf] = useState('95');
  const [margin, setMargin] = useState('5');
  const [p, setP] = useState('50');
  const c = readNumber(conf);
  const e = readNumber(margin);
  const pp = readNumber(p);
  let n: number | null = null;
  let error = '';
  try {
    if (c !== null && e !== null && pp !== null) n = sampleSize(c / 100, e / 100, { p: pp / 100 });
  } catch (err) {
    error = (err as Error).message;
  }
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
      <div className="card space-y-4 p-5">
        <NumberField id="mu-conf" label="Nivel de confianza" value={conf} onChange={setConf} suffix="%" />
        <NumberField
          id="mu-e"
          label="Margen de error"
          value={margin}
          onChange={setMargin}
          suffix="puntos %"
        />
        <NumberField
          id="mu-p"
          label="Proporción esperada"
          value={p}
          onChange={setP}
          suffix="%"
          hint="Sin información previa usa 50 %: da el tamaño más conservador."
        />
      </div>
      <div aria-live="polite">
        {error ? <p className="text-sm font-semibold text-warn">{error}</p> : null}
        {n !== null ? (
          <Stat
            label="Tamaño de muestra necesario"
            value={`${n.toLocaleString('es-EC')} personas`}
            hint="n = z²·p·q ÷ E², redondeado hacia arriba (población grande)."
          />
        ) : null}
      </div>
    </div>
  );
}

export default function StatsTool({ tool }: { tool: ToolInfo }) {
  const [mode, setMode] = useState<Mode>('describir');
  return (
    <ToolLayout
      tool={tool}
      metodo={
        <>
          <p>
            Varianza y desviación muestrales con n − 1; cuartiles con el método inclusivo de las hojas de
            cálculo (CUARTIL.INC), así que coinciden con Excel; histograma con la regla de Sturges; atípicos
            fuera de 1,5 veces el rango intercuartil.
          </p>
          <p>
            Intervalos y pruebas según OpenStax, Introducción a la estadística (capítulos 8, 9 y 12): t de
            Student con n − 1 grados de libertad cuando σ es desconocida, intervalo de proporción con la
            normal, regresión por mínimos cuadrados. Los valores críticos se calculan con Formula.js, la misma
            biblioteca del laboratorio.
          </p>
        </>
      }
    >
      <Tabs<Mode>
        label="Cálculo"
        value={mode}
        onChange={setMode}
        tabs={[
          { id: 'describir', label: 'Describir datos' },
          { id: 'inferir', label: 'Intervalos y pruebas' },
          { id: 'regresion', label: 'Regresión' },
          { id: 'muestra', label: 'Tamaño de muestra' },
        ]}
      />
      {mode === 'describir' ? (
        <Describe />
      ) : mode === 'inferir' ? (
        <Infer />
      ) : mode === 'regresion' ? (
        <Regression />
      ) : (
        <SampleSize />
      )}
    </ToolLayout>
  );
}

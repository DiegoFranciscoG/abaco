import { useState } from 'react';
import { getCached, setCached } from '../../../data/repositories';
import type { ToolInfo } from '../../../domain/tools/catalog';
import { COUNTRIES, fetchIndicator, INDICATORS, type DataCache } from '../../../domain/tools/opendata';
import { LineChart } from '../../../ui/charts';
import { useAsync, useOnline } from '../../../ui/hooks';
import { Notice, Skeleton } from '../../../ui/primitives';
import { ToolLayout } from '../ToolLayout';
import { num } from '../format';

const cache: DataCache = {
  get: (key) => getCached(key),
  set: (key, value, ttl) => setCached(key, value, ttl),
};
const THIS_YEAR = new Date().getFullYear();

export default function MacroTool({ tool }: { tool: ToolInfo }) {
  const online = useOnline();
  const [code, setCode] = useState(INDICATORS[0]?.code ?? '');
  const [countries, setCountries] = useState<string[]>(['ECU', 'COL', 'PER']);
  const [from, setFrom] = useState(2000);
  const state = useAsync(
    () => fetchIndicator(code, countries, from, THIS_YEAR, { cache }),
    [code, countries.join(','), from],
  );
  const indicator = INDICATORS.find((i) => i.code === code);
  const name = (c: string) => COUNTRIES.find((k) => k.code === c)?.nombre ?? c;

  const toggleCountry = (c: string) =>
    setCountries((prev) =>
      prev.includes(c)
        ? prev.length > 1
          ? prev.filter((x) => x !== c)
          : prev
        : prev.length < 5
          ? [...prev, c]
          : prev,
    );

  const years =
    state.status === 'ready'
      ? [...new Set(state.data.series.flatMap((s) => s.points.map((p) => p.year)))].sort((a, b) => a - b)
      : [];

  return (
    <ToolLayout
      tool={tool}
      metodo={
        <>
          <p>
            Fuente: Banco Mundial, World Development Indicators, licencia CC BY 4.0, consultados en vivo con
            su API pública (sin clave). La fuente original de cada indicador se muestra bajo el gráfico. Los
            datos se guardan un día en tu dispositivo para no repetir consultas.
          </p>
          <p>
            Tu navegador envía al Banco Mundial solo el indicador y los países elegidos; ÁBACO no agrega
            ningún dato tuyo.
          </p>
        </>
      }
    >
      {!online ? (
        <Notice tone="warn">
          Sin conexión: esta herramienta necesita internet. Los datos que ya consultaste siguen disponibles.
        </Notice>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="card space-y-5 p-5">
          <label className="block" htmlFor="mc-ind">
            <span className="mb-1 block text-sm font-semibold text-ink-2">Indicador</span>
            <select id="mc-ind" className="field" value={code} onChange={(e) => setCode(e.target.value)}>
              {INDICATORS.map((i) => (
                <option key={i.code} value={i.code}>
                  {i.nombre} ({i.unidad})
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-ink-2">Países (hasta 5)</legend>
            <div className="flex flex-wrap gap-2">
              {COUNTRIES.map((c) => {
                const on = countries.includes(c.code);
                return (
                  <button
                    key={c.code}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleCountry(c.code)}
                    className={`chip min-h-10 ${on ? 'border-red bg-red-soft text-red' : ''}`}
                  >
                    {c.nombre}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <label className="block" htmlFor="mc-from">
            <span className="mb-1 block text-sm font-semibold text-ink-2">Desde el año</span>
            <select
              id="mc-from"
              className="field"
              value={from}
              onChange={(e) => setFrom(Number(e.target.value))}
            >
              {[1990, 2000, 2010, 2015, 2020].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="space-y-3" aria-live="polite">
          {state.status === 'loading' ? <Skeleton lines={6} /> : null}
          {state.status === 'error' ? <Notice tone="warn">{state.error.message}</Notice> : null}
          {state.status === 'ready' && indicator ? (
            <>
              <LineChart
                title={`${indicator.nombre} (${indicator.unidad})`}
                summary={state.data.series
                  .map((s) => {
                    const last = s.points[s.points.length - 1];
                    return last
                      ? `${name(s.country)}: ${num(last.value)} en ${last.year}`
                      : `${name(s.country)}: sin datos`;
                  })
                  .join('. ')}
                xLabel="Año"
                formatX={(x) => String(Math.round(x))}
                series={state.data.series.map((s) => ({
                  name: name(s.country),
                  points: s.points.map((p) => ({ x: p.year, y: p.value })),
                }))}
                table={{
                  columns: ['Año', ...state.data.series.map((s) => name(s.country))],
                  rows: years.map((y) => [
                    String(y),
                    ...state.data.series.map((s) => s.points.find((p) => p.year === y)?.value ?? '—'),
                  ]),
                }}
              />
              <p className="text-xs text-muted">
                Fuente: Banco Mundial, World Development Indicators (CC BY 4.0). Fuente original:{' '}
                {indicator.fuenteOriginal}.
                {state.data.actualizado
                  ? ` Actualizado por el Banco Mundial el ${state.data.actualizado}.`
                  : ''}
              </p>
            </>
          ) : null}
        </div>
      </div>
    </ToolLayout>
  );
}

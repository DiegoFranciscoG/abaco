import { useState } from 'react';
import { getCached, setCached } from '../../../data/repositories';
import type { ToolInfo } from '../../../domain/tools/catalog';
import {
  convert,
  ECB_CURRENCIES,
  fetchLatestUsd,
  fetchUsdSeries,
  type DataCache,
} from '../../../domain/tools/opendata';
import { LineChart } from '../../../ui/charts';
import { useAsync, useOnline } from '../../../ui/hooks';
import { Notice, Skeleton } from '../../../ui/primitives';
import { formatDate } from '../../../ui/utils';
import { NumberField, ToolLayout } from '../ToolLayout';
import { num, readNumber } from '../format';

const cache: DataCache = {
  get: (key) => getCached(key),
  set: (key, value, ttl) => setCached(key, value, ttl),
};
const iso = (d: Date) => d.toISOString().slice(0, 10);
const PERIODS = [
  { id: '1m', label: '1 mes', days: 31 },
  { id: '6m', label: '6 meses', days: 183 },
  { id: '1a', label: '1 año', days: 366 },
  { id: '5a', label: '5 años', days: 1827 },
];

export default function FxTool({ tool }: { tool: ToolInfo }) {
  const online = useOnline();
  const [amount, setAmount] = useState('100');
  const [quote, setQuote] = useState('EUR');
  const [period, setPeriod] = useState('6m');
  const days = PERIODS.find((p) => p.id === period)?.days ?? 183;
  const [today] = useState(() => new Date());
  const from = iso(new Date(today.getTime() - days * 86_400_000));
  const to = iso(today);

  const latest = useAsync(
    () =>
      fetchLatestUsd(
        ECB_CURRENCIES.map((c) => c.code),
        { cache },
      ),
    [],
  );
  const series = useAsync(() => fetchUsdSeries(quote, from, to, { cache }), [quote, from, to]);
  const a = readNumber(amount);
  const rate = latest.status === 'ready' ? latest.data.find((r) => r.quote === quote) : undefined;
  const nameOf = (code: string) => ECB_CURRENCIES.find((c) => c.code === code)?.nombre ?? code;

  return (
    <ToolLayout
      tool={tool}
      metodo={
        <>
          <p>
            Tipos de referencia del Banco Central Europeo, publicados cada día hábil, obtenidos con la API de
            Frankfurter (código abierto, licencia MIT) usando solo el proveedor BCE. Como el BCE publica cada
            moneda frente al euro, el valor frente al dólar es un tipo cruzado calculado por Frankfurter.
            Fuente: BCE.
          </p>
          <p>
            Son tipos de referencia, no precios de compra o venta de un banco o casa de cambio. Ecuador usa el
            dólar como moneda (COMF, art. 94), por eso todo se expresa por cada dólar.
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
        <div className="card space-y-4 p-5">
          <NumberField id="fx-monto" label="Monto" value={amount} onChange={setAmount} suffix="USD" />
          <label className="block" htmlFor="fx-moneda">
            <span className="mb-1 block text-sm font-semibold text-ink-2">Moneda</span>
            <select id="fx-moneda" className="field" value={quote} onChange={(e) => setQuote(e.target.value)}>
              {ECB_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.nombre} ({c.code})
                </option>
              ))}
            </select>
          </label>
          <div aria-live="polite">
            {latest.status === 'loading' ? <Skeleton lines={2} /> : null}
            {latest.status === 'error' ? <Notice tone="warn">{latest.error.message}</Notice> : null}
            {rate && a !== null && a >= 0 ? (
              <div className="rounded-2xl bg-red-tint p-4">
                <p className="tnum font-display text-3xl font-semibold">
                  {num(convert(a, rate.rate), 2)} {quote}
                </p>
                <p className="text-sm text-muted">
                  1 USD = {num(rate.rate, 4)} {quote} · referencia del {formatDate(rate.date)}
                </p>
              </div>
            ) : null}
          </div>
          <p className="text-xs text-muted">
            El peso colombiano y el sol peruano no forman parte de los tipos de referencia del BCE.
          </p>
        </div>
        <div className="space-y-3">
          <div role="group" aria-label="Período" className="flex flex-wrap gap-2">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={period === p.id}
                onClick={() => setPeriod(p.id)}
                className={`chip min-h-10 ${period === p.id ? 'border-red bg-red-soft text-red' : ''}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div aria-live="polite">
            {series.status === 'loading' ? <Skeleton lines={6} /> : null}
            {series.status === 'error' ? <Notice tone="warn">{series.error.message}</Notice> : null}
            {series.status === 'ready' ? (
              <LineChart
                title={`${nameOf(quote)} por cada dólar`}
                summary={
                  series.data.length > 1
                    ? `De ${num(series.data[0]?.rate ?? 0, 4)} el ${formatDate(series.data[0]?.date ?? from)} a ${num(series.data[series.data.length - 1]?.rate ?? 0, 4)} el ${formatDate(series.data[series.data.length - 1]?.date ?? to)}.`
                    : 'Sin datos en el período.'
                }
                xLabel="Fecha"
                formatX={(x) => formatDate(new Date(x).toISOString().slice(0, 10))}
                series={[
                  { name: quote, points: series.data.map((r) => ({ x: Date.parse(r.date), y: r.rate })) },
                ]}
                table={{
                  columns: ['Fecha', `${quote} por USD`],
                  rows: series.data
                    .filter((_, i, arr) => arr.length < 40 || i % Math.ceil(arr.length / 40) === 0)
                    .map((r) => [formatDate(r.date), r.rate]),
                }}
              />
            ) : null}
            <p className="mt-2 text-xs text-muted">
              Fuente: Banco Central Europeo (tipos de referencia), vía Frankfurter.
            </p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

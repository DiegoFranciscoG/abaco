import { useId, type ReactNode } from 'react';
import { formatTick, niceTicks } from './chart-scale';

/**
 * Small SVG charts drawn by hand (no chart library): responsive, themed with CSS variables, and accessible —
 * every chart has a text summary and can show its data as a table.
 */
export interface ChartSeries {
  name: string;
  points: { x: number; y: number | null }[];
  /** CSS color or variable. */
  color?: string;
  dashed?: boolean;
}

export interface ReferenceLine {
  axis: 'x' | 'y';
  value: number;
  label: string;
}

export interface ChartMarker {
  x: number;
  y: number;
  label: string;
}

const PALETTE = ['var(--red)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)'];

const W = 640;
const H = 340;
const M = { top: 18, right: 18, bottom: 40, left: 58 };

export function LineChart({
  series,
  title,
  summary,
  xLabel,
  yLabel,
  references = [],
  markers = [],
  formatX = formatTick,
  table,
}: {
  series: ChartSeries[];
  title: string;
  summary: string;
  xLabel?: string;
  yLabel?: string;
  references?: ReferenceLine[];
  markers?: ChartMarker[];
  formatX?: (x: number) => string;
  table?: { columns: string[]; rows: (string | number)[][] };
}) {
  const id = useId();
  const all = series.flatMap((s) => s.points.filter((p) => p.y !== null && Number.isFinite(p.y)));
  const xs = all.map((p) => p.x);
  const ys = [...all.map((p) => p.y as number), ...references.filter((r) => r.axis === 'y').map((r) => r.value), ...markers.map((m) => m.y)];
  if (xs.length === 0) {
    return (
      <figure className="card p-4">
        <figcaption className="text-sm text-muted">{title}: no hay datos para graficar.</figcaption>
      </figure>
    );
  }
  const xTicks = niceTicks(Math.min(...xs), Math.max(...xs), 6);
  const yTicks = niceTicks(Math.min(...ys), Math.max(...ys), 5);
  const x0 = Math.min(Math.min(...xs), xTicks[0] ?? 0);
  const x1 = Math.max(Math.max(...xs), xTicks[xTicks.length - 1] ?? 1);
  const y0 = yTicks[0] ?? 0;
  const y1 = yTicks[yTicks.length - 1] ?? 1;
  const sx = (x: number) => M.left + ((x - x0) / (x1 - x0 || 1)) * (W - M.left - M.right);
  const sy = (y: number) => H - M.bottom - ((y - y0) / (y1 - y0 || 1)) * (H - M.top - M.bottom);

  const path = (s: ChartSeries) => {
    let d = '';
    let pen = false;
    for (const p of s.points) {
      if (p.y === null || !Number.isFinite(p.y) || p.y < y0 - (y1 - y0) * 2 || p.y > y1 + (y1 - y0) * 2) {
        pen = false;
        continue;
      }
      d += `${pen ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`;
      pen = true;
    }
    return d;
  };

  return (
    <figure className="card overflow-hidden p-3 sm:p-4" aria-labelledby={`${id}-t`}>
      <figcaption id={`${id}-t`} className="mb-2 px-1 text-sm font-semibold">
        {title}
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${title}. ${summary}`}>
        <defs>
          <clipPath id={`${id}-clip`}>
            <rect x={M.left} y={M.top} width={W - M.left - M.right} height={H - M.top - M.bottom} />
          </clipPath>
        </defs>
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line x1={M.left} x2={W - M.right} y1={sy(t)} y2={sy(t)} stroke="var(--line)" strokeWidth={t === 0 ? 1.5 : 1} />
            <text x={M.left - 8} y={sy(t)} dy="0.32em" textAnchor="end" className="fill-[var(--muted)] text-[11px]">
              {formatTick(t)}
            </text>
          </g>
        ))}
        {xTicks
          .filter((t) => t >= x0 && t <= x1)
          .map((t) => (
            <g key={`x${t}`}>
              <line x1={sx(t)} x2={sx(t)} y1={H - M.bottom} y2={H - M.bottom + 5} stroke="var(--line-strong)" />
              <text x={sx(t)} y={H - M.bottom + 18} textAnchor="middle" className="fill-[var(--muted)] text-[11px]">
                {formatX(t)}
              </text>
            </g>
          ))}
        {x0 < 0 && x1 > 0 ? <line x1={sx(0)} x2={sx(0)} y1={M.top} y2={H - M.bottom} stroke="var(--line-strong)" /> : null}
        <g clipPath={`url(#${id}-clip)`}>
          {references.map((r) =>
            r.axis === 'x' ? (
              <line key={`rx${r.label}`} x1={sx(r.value)} x2={sx(r.value)} y1={M.top} y2={H - M.bottom} stroke="var(--muted)" strokeDasharray="4 4" />
            ) : (
              <line key={`ry${r.label}`} x1={M.left} x2={W - M.right} y1={sy(r.value)} y2={sy(r.value)} stroke="var(--muted)" strokeDasharray="4 4" />
            ),
          )}
          {series.map((s, i) => (
            <path
              key={s.name}
              d={path(s)}
              fill="none"
              stroke={s.color ?? PALETTE[i % PALETTE.length]}
              strokeWidth={2.5}
              strokeDasharray={s.dashed ? '7 6' : undefined}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {markers.map((m) => (
            <g key={`m${m.label}`}>
              <circle cx={sx(m.x)} cy={sy(m.y)} r={5.5} fill="var(--surface)" stroke="var(--ink)" strokeWidth={2} />
            </g>
          ))}
        </g>
        {references.map((r) => (
          <text
            key={`rl${r.label}`}
            x={r.axis === 'x' ? sx(r.value) + 4 : W - M.right - 4}
            y={r.axis === 'x' ? M.top + 12 : sy(r.value) - 6}
            textAnchor={r.axis === 'x' ? 'start' : 'end'}
            className="fill-[var(--ink-2)] text-[11px] font-semibold"
          >
            {r.label}
          </text>
        ))}
        {xLabel ? (
          <text x={(M.left + W - M.right) / 2} y={H - 4} textAnchor="middle" className="fill-[var(--muted)] text-[11px]">
            {xLabel}
          </text>
        ) : null}
        {yLabel ? (
          <text x={12} y={(M.top + H - M.bottom) / 2} transform={`rotate(-90 12 ${(M.top + H - M.bottom) / 2})`} textAnchor="middle" className="fill-[var(--muted)] text-[11px]">
            {yLabel}
          </text>
        ) : null}
      </svg>
      {series.length > 1 ? (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-ink-2">
          {series.map((s, i) => (
            <li key={s.name} className="flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block h-0.5 w-5 rounded" style={{ background: s.color ?? PALETTE[i % PALETTE.length], opacity: s.dashed ? 0.7 : 1 }} />
              {s.name}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="sr-only">{summary}</p>
      {table ? <DataTable caption={title} columns={table.columns} rows={table.rows} /> : null}
    </figure>
  );
}

export function BarChart({
  bars,
  title,
  summary,
  xLabel,
  extra,
}: {
  bars: { label: string; value: number }[];
  title: string;
  summary: string;
  xLabel?: string;
  extra?: ReactNode;
}) {
  const id = useId();
  const max = Math.max(1, ...bars.map((b) => b.value));
  const ticks = niceTicks(0, max, 4);
  const top = ticks[ticks.length - 1] ?? max;
  const bw = (W - M.left - M.right) / Math.max(1, bars.length);
  const sy = (v: number) => H - M.bottom - (v / top) * (H - M.top - M.bottom);
  return (
    <figure className="card overflow-hidden p-3 sm:p-4" aria-labelledby={`${id}-t`}>
      <figcaption id={`${id}-t`} className="mb-2 px-1 text-sm font-semibold">
        {title}
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${title}. ${summary}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={W - M.right} y1={sy(t)} y2={sy(t)} stroke="var(--line)" />
            <text x={M.left - 8} y={sy(t)} dy="0.32em" textAnchor="end" className="fill-[var(--muted)] text-[11px]">
              {formatTick(t)}
            </text>
          </g>
        ))}
        {bars.map((b, i) => (
          <g key={`${b.label}-${i}`}>
            <rect x={M.left + i * bw + 2} y={sy(b.value)} width={Math.max(1, bw - 4)} height={H - M.bottom - sy(b.value)} rx={4} fill="var(--red)" opacity={0.85} />
            {bars.length <= 12 ? (
              <text x={M.left + i * bw + bw / 2} y={H - M.bottom + 16} textAnchor="middle" className="fill-[var(--muted)] text-[10px]">
                {b.label}
              </text>
            ) : null}
          </g>
        ))}
        {xLabel ? (
          <text x={(M.left + W - M.right) / 2} y={H - 4} textAnchor="middle" className="fill-[var(--muted)] text-[11px]">
            {xLabel}
          </text>
        ) : null}
      </svg>
      {extra}
      <p className="sr-only">{summary}</p>
      <DataTable caption={title} columns={['Clase', 'Frecuencia']} rows={bars.map((b) => [b.label, b.value])} />
    </figure>
  );
}

export function DataTable({ caption, columns, rows }: { caption: string; columns: string[]; rows: (string | number)[][] }) {
  return (
    <details className="mt-3 px-1">
      <summary className="cursor-pointer text-sm font-semibold text-red">Ver los datos en una tabla</summary>
      <div className="mt-2 max-h-72 overflow-auto rounded-xl border border-line" tabIndex={0} role="region" aria-label={`Datos: ${caption}`}>
        <table className="tnum w-full text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 bg-surface-2 text-xs text-muted uppercase">
            <tr>
              {columns.map((c) => (
                <th key={c} scope="col" className="px-3 py-2">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-line">
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-1.5">
                    {typeof cell === 'number' ? formatTick(cell) : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

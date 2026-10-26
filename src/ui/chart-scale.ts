/** Axis helpers for the hand-drawn SVG charts. */
/** "Nice" tick values (1, 2, 5 × 10ⁿ) covering [min, max]. */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1;
    return niceTicks(min - pad, max + pad, count);
  }
  const span = max - min;
  const raw = span / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.5; v += step) ticks.push(Math.round(v / step) * step);
  return ticks;
}

export function formatTick(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000)
    return `${(value / 1_000_000).toLocaleString('es-EC', { maximumFractionDigits: 1 })} M`;
  if (abs >= 10_000) return `${(value / 1000).toLocaleString('es-EC', { maximumFractionDigits: 1 })} k`;
  return value.toLocaleString('es-EC', { maximumFractionDigits: abs < 1 ? 3 : 2 });
}

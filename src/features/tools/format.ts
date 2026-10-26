/** Number reading and formatting shared by the study tools (es-EC conventions). */
/** "1.234,5" or "1234.5" → 1234.5; empty or invalid → null. */
export function readNumber(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  const normalized = /,\d*$/.test(t) ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export const money = (n: number): string =>
  n.toLocaleString('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
export const num = (n: number, digits = 2): string =>
  n.toLocaleString('es-EC', { maximumFractionDigits: digits });
export const pct = (n: number, digits = 2): string =>
  `${(n * 100).toLocaleString('es-EC', { maximumFractionDigits: digits })} %`;

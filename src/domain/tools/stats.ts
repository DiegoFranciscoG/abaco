/**
 * Statistics for the "Calculadora estadística" tool. Definitions follow OpenStax Introductory Statistics 2e
 * (sample variance with n − 1, Student t for unknown σ, least-squares regression); quartiles use the inclusive
 * method of spreadsheets (CUARTIL.INC / QUARTILE.INC) so results match Excel and Google Sheets.
 * Distribution quantiles come from Formula.js (MIT), the same library used by the lab.
 */
import * as formulajs from '@formulajs/formulajs';

export { parseData } from './parse';

type Fn = (...args: unknown[]) => unknown;
const fn = (path: string): Fn => {
  let target: unknown = formulajs;
  for (const part of path.split('.')) target = (target as Record<string, unknown>)[part];
  if (typeof target !== 'function') throw new Error(`Función estadística no disponible: ${path}`);
  return target as Fn;
};
const num = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new RangeError('Cálculo estadístico no definido para estos datos.');
  return value;
};

export interface Descriptive {
  n: number;
  media: number;
  mediana: number;
  moda: number[];
  minimo: number;
  maximo: number;
  rango: number;
  q1: number;
  q3: number;
  rangoIntercuartil: number;
  varianza: number;
  desviacion: number;
  coeficienteVariacion: number | null;
  asimetria: number | null;
}

export function describe(values: readonly number[]): Descriptive {
  if (values.length < 2) throw new RangeError('Se necesitan al menos dos datos.');
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const media = sorted.reduce((s, v) => s + v, 0) / n;
  const mediana =
    n % 2 ? (sorted[(n - 1) / 2] as number) : ((sorted[n / 2 - 1] as number) + (sorted[n / 2] as number)) / 2;
  const counts = new Map<number, number>();
  for (const v of sorted) counts.set(v, (counts.get(v) ?? 0) + 1);
  const maxCount = Math.max(...counts.values());
  const moda = maxCount > 1 ? [...counts.entries()].filter(([, c]) => c === maxCount).map(([v]) => v) : [];
  const varianza = sorted.reduce((s, v) => s + (v - media) ** 2, 0) / (n - 1);
  const desviacion = Math.sqrt(varianza);
  const q1 = num(fn('QUARTILE.INC')(sorted, 1));
  const q3 = num(fn('QUARTILE.INC')(sorted, 3));
  const minimo = sorted[0] as number;
  const maximo = sorted[n - 1] as number;
  return {
    n,
    media,
    mediana,
    moda,
    minimo,
    maximo,
    rango: maximo - minimo,
    q1,
    q3,
    rangoIntercuartil: q3 - q1,
    varianza,
    desviacion,
    coeficienteVariacion: media !== 0 ? desviacion / Math.abs(media) : null,
    asimetria: n >= 3 && desviacion > 0 ? num(fn('SKEW')(sorted)) : null,
  };
}

export interface HistogramBin {
  desde: number;
  hasta: number;
  frecuencia: number;
}

/** Histogram with Sturges' rule (k = 1 + log2 n), closed on the left; the last class includes the maximum. */
export function histogram(values: readonly number[]): HistogramBin[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const k = Math.max(1, Math.ceil(1 + Math.log2(values.length)));
  if (max === min) return [{ desde: min, hasta: max, frecuencia: values.length }];
  const width = (max - min) / k;
  const bins = Array.from({ length: k }, (_, i) => ({
    desde: min + i * width,
    hasta: min + (i + 1) * width,
    frecuencia: 0,
  }));
  for (const v of values) {
    const index = Math.min(k - 1, Math.floor((v - min) / width));
    const bin = bins[index];
    if (bin) bin.frecuencia += 1;
  }
  return bins;
}

export interface BoxPlot {
  q1: number;
  mediana: number;
  q3: number;
  bigoteInferior: number;
  bigoteSuperior: number;
  atipicos: number[];
}

/** Box plot with Tukey fences at 1.5 × IQR. */
export function boxPlot(values: readonly number[]): BoxPlot {
  const d = describe(values);
  const low = d.q1 - 1.5 * d.rangoIntercuartil;
  const high = d.q3 + 1.5 * d.rangoIntercuartil;
  const inside = values.filter((v) => v >= low && v <= high);
  return {
    q1: d.q1,
    mediana: d.mediana,
    q3: d.q3,
    bigoteInferior: Math.min(...inside),
    bigoteSuperior: Math.max(...inside),
    atipicos: values.filter((v) => v < low || v > high),
  };
}

export interface Interval {
  inferior: number;
  superior: number;
  margen: number;
  critico: number;
}

/** Confidence interval for a mean with unknown σ: x̄ ± t·s/√n, df = n − 1. */
export function meanInterval(values: readonly number[], confianza: number): Interval {
  if (!(confianza > 0 && confianza < 1)) throw new RangeError('La confianza debe estar entre 0 y 1.');
  const d = describe(values);
  const critico = num(fn('T.INV.2T')(1 - confianza, d.n - 1));
  const margen = (critico * d.desviacion) / Math.sqrt(d.n);
  return { inferior: d.media - margen, superior: d.media + margen, margen, critico };
}

/** Confidence interval for a proportion: p̂ ± z·√(p̂q̂/n). */
export function proportionInterval(exitos: number, n: number, confianza: number): Interval & { p: number } {
  if (!Number.isInteger(exitos) || !Number.isInteger(n) || n <= 0 || exitos < 0 || exitos > n) {
    throw new RangeError('Los éxitos deben ser un entero entre 0 y n.');
  }
  const p = exitos / n;
  const critico = num(fn('NORM.S.INV')(1 - (1 - confianza) / 2));
  const margen = critico * Math.sqrt((p * (1 - p)) / n);
  return { p, inferior: p - margen, superior: p + margen, margen, critico };
}

export interface TTest {
  t: number;
  gl: number;
  valorP: number;
  rechaza: boolean;
}

/** One-sample t test of H0: μ = μ0 against the chosen alternative. */
export function oneSampleT(
  values: readonly number[],
  mu0: number,
  alpha: number,
  alternativa: 'distinta' | 'mayor' | 'menor',
): TTest {
  const d = describe(values);
  const gl = d.n - 1;
  const t = (d.media - mu0) / (d.desviacion / Math.sqrt(d.n));
  const rightTail = num(fn('T.DIST.RT')(Math.abs(t), gl));
  let valorP: number;
  if (alternativa === 'distinta') valorP = 2 * rightTail;
  else if (alternativa === 'mayor') valorP = t >= 0 ? rightTail : 1 - rightTail;
  else valorP = t <= 0 ? rightTail : 1 - rightTail;
  return { t, gl, valorP, rechaza: valorP < alpha };
}

/** Sample size: for a mean n = (z·σ/E)², for a proportion n = z²·p·q/E², rounded up. */
export function sampleSize(
  confianza: number,
  margen: number,
  opts: { sigma: number } | { p: number },
): number {
  if (!(margen > 0)) throw new RangeError('El margen de error debe ser mayor que cero.');
  const z = num(fn('NORM.S.INV')(1 - (1 - confianza) / 2));
  const n =
    'sigma' in opts ? ((z * opts.sigma) / margen) ** 2 : (z ** 2 * opts.p * (1 - opts.p)) / margen ** 2;
  return Math.ceil(n - 1e-9);
}

export interface Regression {
  a: number;
  b: number;
  r: number;
  r2: number;
  n: number;
}

/** Least-squares line ŷ = a + b·x and Pearson's r. */
export function regression(x: readonly number[], y: readonly number[]): Regression {
  if (x.length !== y.length) throw new RangeError('X e Y deben tener la misma cantidad de datos.');
  const n = x.length;
  if (n < 3) throw new RangeError('Se necesitan al menos tres pares de datos.');
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = (x[i] as number) - mx;
    const dy = (y[i] as number) - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0) throw new RangeError('Todos los valores de X son iguales: no hay recta posible.');
  const b = sxy / sxx;
  const r = syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy);
  return { a: my - b * mx, b, r, r2: r * r, n };
}

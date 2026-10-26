/**
 * Function plotter maths for the "Graficador de funciones" tool. Expressions go through the same safe parser as the
 * formulas (no eval): only the variable x, numbers, operators and the engine's function list are accepted.
 * Derivatives are numerical (central difference), the method used to approximate the derivative as a limit in
 * OpenStax Calculus Volume 1, 3.1.
 */
import { tryEvaluateAlgebra } from '../formula';

const WORD_FUNCTIONS: [RegExp, string][] = [
  [/\braiz\s*\(/gi, 'SQRT('],
  [/\bsqrt\s*\(/gi, 'SQRT('],
  [/\bln\s*\(/gi, 'LN('],
  [/\blog\s*\(/gi, 'LOG10('],
  [/\bexp\s*\(/gi, 'EXP('],
  [/\babs\s*\(/gi, 'ABS('],
];

/**
 * Accepts the way students write on paper: "2x^2 - 3x + 1", "e^(0.05x)", "raiz(x)", decimal commas ("0,5x").
 * Returns an expression for the formula engine (algebra mode, English separators).
 */
export function normalizeExpression(input: string): string {
  let s = input.trim().replace(/\s+/g, ' ');
  if (s.length > 200) throw new RangeError('La expresión es demasiado larga (máximo 200 caracteres).');
  s = s.replace(/^\s*(?:y|f\s*\(\s*x\s*\))\s*=\s*/i, '');
  s = s.replace(/(\d),(\d)/g, '$1.$2');
  for (const [pattern, replacement] of WORD_FUNCTIONS) s = s.replace(pattern, replacement);
  s = s.replace(/\bpi\b/gi, 'PI()');
  s = s.replace(/\be\s*\^/g, 'EXP(1)^');
  s = s.replace(/\bX\b/g, 'x');
  // Implicit multiplication: 2x, 2(, x(, )(, )x, )2
  s = s.replace(/(?<![A-Z]\d*)(\d)\s*(x|\(|[A-Z]{2,}\d*\()/g, '$1*$2');
  s = s.replace(/\bx\s*\(/g, 'x*(');
  s = s.replace(/\)\s*(\(|x|\d)/g, ')*$1');
  return s;
}

export type Evaluator = (x: number) => number | null;

/** Compiles once; returns null values where the function is undefined (e.g. LN of a negative number). */
export function compile(
  input: string,
): { ok: true; f: Evaluator; expression: string } | { ok: false; message: string } {
  let expression: string;
  try {
    expression = normalizeExpression(input);
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
  if (!expression) return { ok: false, message: 'Escribe una función de x, por ejemplo 2x^2 - 3x + 1.' };
  const probe = tryEvaluateAlgebra(expression, { x: 1.2345 });
  if (!probe.ok && !/^#(DIV|NUM|VALUE)/.test(probe.message)) {
    return {
      ok: false,
      message: probe.message.startsWith('#NAME')
        ? 'Usa solo la variable x y funciones conocidas (raiz, ln, log, exp, abs).'
        : probe.message,
    };
  }
  const f: Evaluator = (x) => {
    const r = tryEvaluateAlgebra(expression, { x });
    return r.ok && Number.isFinite(r.value) ? r.value : null;
  };
  return { ok: true, f, expression };
}

export function sample(f: Evaluator, xmin: number, xmax: number, n = 240): { x: number; y: number | null }[] {
  if (!(xmax > xmin)) throw new RangeError('El extremo derecho debe ser mayor que el izquierdo.');
  return Array.from({ length: n + 1 }, (_, i) => {
    const x = xmin + ((xmax - xmin) * i) / n;
    return { x, y: f(x) };
  });
}

export function derivative(f: Evaluator, x: number, h = 1e-5): number | null {
  const step = h * Math.max(1, Math.abs(x));
  const a = f(x + step);
  const b = f(x - step);
  return a === null || b === null ? null : (a - b) / (2 * step);
}

function bisect(g: Evaluator, a: number, b: number): number | null {
  let ga = g(a);
  const gb = g(b);
  if (ga === null || gb === null || Math.sign(ga) === Math.sign(gb)) return null;
  let lo = a;
  let hi = b;
  for (let i = 0; i < 80; i += 1) {
    const mid = (lo + hi) / 2;
    const gm = g(mid);
    if (gm === null) return null;
    if (gm === 0) return mid;
    if (Math.sign(gm) === Math.sign(ga)) {
      lo = mid;
      ga = gm;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

const roundNice = (v: number): number => Math.round(v * 1e6) / 1e6;

/** Zeros found by sign changes on a fine grid (may miss double roots that only touch the axis). */
export function roots(f: Evaluator, xmin: number, xmax: number, n = 600): number[] {
  const out: number[] = [];
  const pts = sample(f, xmin, xmax, n);
  for (let i = 1; i < pts.length; i += 1) {
    const p = pts[i - 1];
    const q = pts[i];
    if (!p || !q || p.y === null || q.y === null) continue;
    if (p.y === 0) out.push(roundNice(p.x));
    else if (Math.sign(p.y) !== Math.sign(q.y)) {
      const r = bisect(f, p.x, q.x);
      if (r !== null) out.push(roundNice(r));
    }
  }
  return [...new Set(out)];
}

export interface Extremum {
  x: number;
  y: number;
  tipo: 'maximo' | 'minimo';
}

/** Local maxima and minima where the numerical derivative changes sign. */
export function extrema(f: Evaluator, xmin: number, xmax: number, n = 600): Extremum[] {
  const d: Evaluator = (x) => derivative(f, x);
  const out: Extremum[] = [];
  const pts = sample(d, xmin, xmax, n);
  for (let i = 1; i < pts.length; i += 1) {
    const p = pts[i - 1];
    const q = pts[i];
    if (!p || !q || p.y === null || q.y === null || Math.sign(p.y) === Math.sign(q.y)) continue;
    const x = bisect(d, p.x, q.x);
    const y = x === null ? null : f(x);
    if (x !== null && y !== null)
      out.push({ x: roundNice(x), y: roundNice(y), tipo: p.y > 0 ? 'maximo' : 'minimo' });
  }
  return out;
}

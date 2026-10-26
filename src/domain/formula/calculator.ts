import { parseLocaleNumber } from '../sheet/sheet';
import { asNumber, evaluateAlgebra, FormulaError, FormulaSyntaxError, type Variables } from './index';

export interface CalculoSpec {
  tipo: 'directo' | 'implicito';
  expresion: string;
  incognita?: string;
}

export type CalcResult = { ok: true; value: number } | { ok: false; message: string };

/** Reads "120; 135,5; 150" or "120 135.5 150" into numbers. */
export function parseNumberList(text: string): number[] | null {
  const parts = text
    .split(/[;\n\t]|\s{1,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  const values = parts.map((p) => parseLocaleNumber(p, 'es') ?? parseLocaleNumber(p, 'en'));
  return values.every((v): v is number => v !== null) ? values : null;
}

export function parseNumberInput(text: string): number | null {
  return parseLocaleNumber(text.trim(), 'es') ?? parseLocaleNumber(text.trim(), 'en');
}

function evaluateNumber(expression: string, variables: Variables): number | FormulaError {
  return asNumber(evaluateAlgebra(expression, variables));
}

/**
 * Finds the root of an implicit formula (for example the IRR, where NPV(r) = 0). Scans for a sign change and
 * then bisects; returns an error message when there is no root in a sensible range.
 */
export function solveImplicit(
  expression: string,
  variables: Variables,
  unknown: string,
  lo = -0.99,
  hi = 10,
): CalcResult {
  const f = (x: number): number | null => {
    const v = evaluateNumber(expression, { ...variables, [unknown]: x });
    return v instanceof FormulaError ? null : v;
  };
  const steps = 400;
  let a = lo;
  let fa = f(a);
  for (let i = 1; i <= steps; i += 1) {
    const b = lo + ((hi - lo) * i) / steps;
    const fb = f(b);
    if (fa !== null && fb !== null && Math.sign(fa) !== Math.sign(fb)) {
      let left = a;
      let right = b;
      let fl = fa;
      for (let k = 0; k < 100; k += 1) {
        const mid = (left + right) / 2;
        const fm = f(mid);
        if (fm === null) break;
        if (Math.abs(fm) < 1e-10) return { ok: true, value: mid };
        if (Math.sign(fm) === Math.sign(fl)) {
          left = mid;
          fl = fm;
        } else {
          right = mid;
        }
      }
      return { ok: true, value: (left + right) / 2 };
    }
    a = b;
    fa = fb;
  }
  return { ok: false, message: 'No hay una solución en un rango razonable con estos datos.' };
}

export function calculate(spec: CalculoSpec, variables: Variables): CalcResult {
  try {
    if (spec.tipo === 'implicito') {
      if (!spec.incognita) return { ok: false, message: 'Falta la incógnita' };
      return solveImplicit(spec.expresion, variables, spec.incognita);
    }
    const value = evaluateNumber(spec.expresion, variables);
    if (value instanceof FormulaError) {
      return {
        ok: false,
        message:
          value.code === '#DIV/0!'
            ? 'Hay una división entre cero con estos datos.'
            : 'Revisa los datos: el cálculo no tiene resultado válido.',
      };
    }
    return { ok: true, value };
  } catch (error) {
    if (error instanceof FormulaSyntaxError) return { ok: false, message: error.message };
    throw error;
  }
}

/** Accepts "0,5367", "53,67 %" or "1.050,00" as an answer; percentages become proportions when expected. */
export function parseAnswer(text: string, expectsProportion: boolean): number | null {
  const trimmed = text.trim().replace(/\s+/g, '');
  if (!trimmed) return null;
  const hasPercent = trimmed.endsWith('%');
  const value = parseNumberInput(hasPercent ? trimmed.slice(0, -1) : trimmed);
  if (value === null) return null;
  if (hasPercent) return value / 100;
  // "53,67" for a proportion question is read as a percentage written without the sign.
  if (expectsProportion && Math.abs(value) > 1.5) return value / 100;
  return value;
}

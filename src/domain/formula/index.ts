import { cellKey, rangeKeys, type CellRef } from './address';
import { evaluate } from './evaluator';
import { parse } from './parser';
import { FormulaSyntaxError, type Locale } from './tokenizer';
import { firstScalar, FormulaError, isMatrix, toNumber, type Matrix, type Scalar, type Value } from './values';

export { parse, collectReferences, type Node } from './parser';
export { FormulaSyntaxError, tokenize, type Locale } from './tokenizer';
export { translateFormula, canonicalFunctionName, compactFormula, SPANISH_TO_ENGLISH, ENGLISH_TO_SPANISH } from './locale';
export { FUNCTION_CATALOG, type FunctionInfo } from './functions';
export * from './values';
export * from './address';
export { evaluate, type EvalContext } from './evaluator';

export type Variables = Record<string, number | number[]>;

/**
 * Evaluates an algebraic expression written with variable names (content formulas and exercises).
 * Syntax is Excel's (English separators): `VF/(1+i)^n`, `SUM((x-AVERAGE(x))^2)/(COUNT(x)-1)`.
 */
export function evaluateAlgebra(expression: string, variables: Variables): Value {
  const ast = parse(expression, { mode: 'algebra', locale: 'en' });
  return evaluate(ast, { resolveName: (name) => variables[name] });
}

/** Evaluates an Excel formula against a small map of cell values ({ B1: -1000, B2: 300 }). */
export function evaluateExcel(
  formula: string,
  cells: Record<string, number | string> = {},
  locale: Locale = 'en',
): Value {
  const ast = parse(formula, { mode: 'sheet', locale });
  return evaluate(ast, {
    resolveCell: (ref: CellRef) => cells[cellKey(ref.col, ref.row)] ?? null,
    resolveRange: (from, to) => rangeKeys(from, to).map((row) => row.map((key) => cells[key] ?? null)),
  });
}

/** Numeric result of an evaluation, or the error that prevented it. */
export function asNumber(value: Value): number | FormulaError {
  const scalar = isMatrix(value) ? firstScalar(value) : value;
  return toNumber(scalar);
}

export function isClose(actual: number, expected: number, tolerance: number): boolean {
  return Math.abs(actual - expected) <= tolerance + Number.EPSILON * Math.max(1, Math.abs(expected));
}

/** Safe wrapper used by the UI: never throws, returns a readable message instead. */
export function tryEvaluateAlgebra(
  expression: string,
  variables: Variables,
): { ok: true; value: number } | { ok: false; message: string } {
  try {
    const result = asNumber(evaluateAlgebra(expression, variables));
    if (result instanceof FormulaError) return { ok: false, message: result.code };
    return { ok: true, value: result };
  } catch (error) {
    if (error instanceof FormulaSyntaxError) return { ok: false, message: error.message };
    throw error;
  }
}

export type { CellRef, Matrix, Scalar, Value };

export const ERROR_CODES = [
  '#DIV/0!',
  '#VALUE!',
  '#REF!',
  '#NAME?',
  '#NUM!',
  '#N/A',
  '#NULL!',
  '#CIRC!',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

/** Spanish Excel spelling of each error, shown to students. #CIRC! is ÁBACO's explicit circular-reference error. */
export const ERROR_LABELS_ES: Record<ErrorCode, string> = {
  '#DIV/0!': '#¡DIV/0!',
  '#VALUE!': '#¡VALOR!',
  '#REF!': '#¡REF!',
  '#NAME?': '#¿NOMBRE?',
  '#NUM!': '#¡NUM!',
  '#N/A': '#N/D',
  '#NULL!': '#¡NULO!',
  '#CIRC!': '#¡CIRCULAR!',
};

export const ERROR_HINTS_ES: Record<ErrorCode, string> = {
  '#DIV/0!': 'Hay una división entre cero o una celda vacía en el divisor.',
  '#VALUE!': 'Un argumento tiene un tipo inesperado (por ejemplo, texto donde va un número).',
  '#REF!': 'La fórmula apunta a una celda que no existe.',
  '#NAME?': 'La función o el nombre no existe. Revisa la ortografía o el idioma de la función.',
  '#NUM!': 'El cálculo no tiene un resultado numérico válido (por ejemplo, la TIR no converge).',
  '#N/A': 'Falta un valor que la función necesita.',
  '#NULL!': 'El rango indicado no es válido.',
  '#CIRC!': 'La celda depende de sí misma, directa o indirectamente.',
};

export class FormulaError {
  constructor(
    readonly code: ErrorCode,
    readonly detail?: string,
  ) {}

  toString(): string {
    return this.code;
  }
}

export type Scalar = number | string | boolean | null | FormulaError;
export type Matrix = Scalar[][];
export type Value = Scalar | Matrix;

export function isMatrix(value: Value): value is Matrix {
  return Array.isArray(value);
}

export function isError(value: unknown): value is FormulaError {
  return value instanceof FormulaError;
}

/** Converts a JavaScript value returned by a function implementation into an engine value. */
export function fromNative(result: unknown): Value {
  if (result instanceof FormulaError) return result;
  if (result instanceof Error) {
    const code = (ERROR_CODES as readonly string[]).includes(result.message)
      ? (result.message as ErrorCode)
      : '#VALUE!';
    return new FormulaError(code, result.message);
  }
  if (typeof result === 'number') {
    return Number.isFinite(result) ? result : new FormulaError('#NUM!');
  }
  if (typeof result === 'string' || typeof result === 'boolean' || result === null) return result;
  if (result === undefined) return null;
  if (Array.isArray(result)) {
    const rows = result.every((row) => Array.isArray(row)) ? (result as unknown[][]) : [result as unknown[]];
    return rows.map((row) => row.map((cell) => toScalar(fromNative(cell))));
  }
  if (result instanceof Date) return result.getTime();
  return new FormulaError('#VALUE!');
}

function toScalar(value: Value): Scalar {
  return isMatrix(value) ? (value[0]?.[0] ?? null) : value;
}

/** Excel-like numeric coercion of a single value. */
export function toNumber(value: Scalar): number | FormulaError {
  if (value instanceof FormulaError) return value;
  if (value === null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  const trimmed = value.trim();
  if (trimmed === '') return 0;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : new FormulaError('#VALUE!', `"${value}" no es un número`);
}

export function toText(value: Scalar): string | FormulaError {
  if (value instanceof FormulaError) return value;
  if (value === null) return '';
  if (typeof value === 'boolean') return value ? 'VERDADERO' : 'FALSO';
  return String(value);
}

export function toBoolean(value: Scalar): boolean | FormulaError {
  if (value instanceof FormulaError) return value;
  if (value === null) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const upper = value.trim().toUpperCase();
  if (upper === 'TRUE' || upper === 'VERDADERO') return true;
  if (upper === 'FALSE' || upper === 'FALSO') return false;
  return new FormulaError('#VALUE!');
}

/** Flattens a value into a list of scalars (row by row). */
export function flatten(value: Value): Scalar[] {
  return isMatrix(value) ? value.flat() : [value];
}

/** First scalar of a value (Excel's implicit intersection for single-cell display). */
export function firstScalar(value: Value): Scalar {
  return toScalar(value);
}

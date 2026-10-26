import type { CellFormat } from '../content/schemas';

/**
 * Shared shape of every deliverable ("entregable"): an assignment solved step by step. The calculation is a pure
 * function; the result carries the summary, every intermediate step with its numbers, the tables to hand in and a
 * spreadsheet with live formulas. Tests T-12 (hand-solved cases), T-13 (the exported workbook recalculates to the
 * same numbers) and T-14 (each step evaluates to what it shows) run over all of them.
 */
export type ValueFormat = 'money' | 'number' | 'percent' | 'integer' | 'text';

export interface Step {
  titulo: string;
  /** The step as the student writes it, with its numbers: "Cuota = 10.000 × 0,0125 ÷ (1 − 1,0125^−12)". */
  expresion: string;
  /** Excel formula with the same literal numbers (English syntax), evaluated by T-14: "=10000*0.0125/(1-1.0125^-12)". */
  calculo: string;
  resultado: number;
  formato: ValueFormat;
}

export interface Column {
  titulo: string;
  formato: ValueFormat;
}

export interface OutputTable {
  id: string;
  titulo: string;
  columnas: Column[];
  filas: (string | number | null)[][];
  /** Totals row (null cells stay empty). */
  total?: (string | number | null)[];
}

export interface SummaryItem {
  etiqueta: string;
  valor: number | string;
  formato: ValueFormat;
  /** The main answer of the assignment. */
  destacado?: boolean;
}

export interface DeliverableResult {
  resumen: SummaryItem[];
  pasos: Step[];
  tablas: OutputTable[];
  advertencias: string[];
  /** Plain-language reading of the result, derived from definitions (never from invented benchmarks). */
  interpretacion: string[];
}

export interface SheetExport {
  /** A1 cells with values or formulas in English syntax (the .xlsx format stores them that way). */
  cells: Record<string, string>;
  formats: Record<string, CellFormat>;
  /** Cells whose recalculated value must equal a number shown on screen (T-13). */
  checks: { cell: string; valor: number; etiqueta: string }[];
}

/** Input problems explained to the student; the calculation does not run until they are fixed. */
export class DeliverableError extends Error {
  constructor(readonly errores: string[]) {
    super(errores.join(' '));
    this.name = 'DeliverableError';
  }
}

export interface DeliverableDefinition<I> {
  id: string;
  /** Validates and normalizes saved or typed inputs (never trusts what comes from storage). */
  parse: (raw: unknown) => I;
  ejemplo: I;
  compute: (input: I) => DeliverableResult;
  toSheet: (input: I, result: DeliverableResult) => SheetExport;
  /** Ids of content/fuentes.json behind the method. */
  fuentes: string[];
  /** Ids of content/normativa.json the calculation uses. */
  cifras: string[];
}

export const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;
export const round4 = (value: number): number => Math.round((value + Number.EPSILON) * 10_000) / 10_000;

/** Number in an Excel formula: plain decimal point, no thousands separator. */
export const xl = (value: number): string => {
  if (!Number.isFinite(value)) throw new RangeError('Número no válido en la fórmula');
  return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(15)));
};

/** Number as the student writes it in Ecuador: 1.234,56. */
export const es = (value: number, digits = 2): string =>
  value.toLocaleString('es-EC', { minimumFractionDigits: 0, maximumFractionDigits: digits });

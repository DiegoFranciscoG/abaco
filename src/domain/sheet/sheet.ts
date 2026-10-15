import {
  cellKey,
  collectReferences,
  evaluate,
  FormulaError,
  FormulaSyntaxError,
  isMatrix,
  parse,
  parseCellRef,
  rangeKeys,
  type CellRef,
  type Locale,
  type Node,
  type Scalar,
  type Value,
} from '../formula';

export const SHEET_LIMITS = { cols: 26, rows: 200, cells: 5000, inputLength: 2000 } as const;

export type ParsedInput =
  | { kind: 'empty' }
  | { kind: 'formula'; text: string }
  | { kind: 'number'; value: number }
  | { kind: 'bool'; value: boolean }
  | { kind: 'text'; value: string };

const BOOL_WORDS: Record<string, boolean> = { TRUE: true, FALSE: false, VERDADERO: true, FALSO: false };

/**
 * Interprets what the student typed in a cell. Numbers accept the locale decimal separator, an optional "$"
 * and a trailing "%". Thousands separators are accepted only in their full pattern (1.234.567,89 in Spanish).
 */
export function parseInput(raw: string, locale: Locale): ParsedInput {
  const text = raw.trim();
  if (text === '') return { kind: 'empty' };
  if (text.startsWith('=') && text.length > 1) return { kind: 'formula', text };
  const upper = text.toUpperCase();
  if (upper in BOOL_WORDS) return { kind: 'bool', value: BOOL_WORDS[upper] as boolean };
  const numeric = parseLocaleNumber(text, locale);
  return numeric === null ? { kind: 'text', value: text } : { kind: 'number', value: numeric };
}

export function parseLocaleNumber(text: string, locale: Locale): number | null {
  let s = text.replace(/\s/g, '');
  let percent = false;
  if (s.endsWith('%')) {
    percent = true;
    s = s.slice(0, -1);
  }
  let sign = 1;
  if (s.startsWith('-')) {
    sign = -1;
    s = s.slice(1);
  }
  if (s.startsWith('$')) s = s.slice(1);
  const decimal = locale === 'es' ? ',' : '.';
  const thousands = locale === 'es' ? '.' : ',';
  const grouped = new RegExp(`^\\d{1,3}(\\${thousands}\\d{3})+(\\${decimal}\\d+)?$`);
  if (grouped.test(s)) s = s.split(thousands).join('');
  const plain = new RegExp(`^(\\d+(\\${decimal}\\d*)?|\\${decimal}\\d+)$`);
  // Also accept the other separator as decimal when unambiguous (students switching between Excel versions).
  const other = locale === 'es' ? /^\d+\.\d+$/ : null;
  if (!plain.test(s) && !(other && other.test(s))) return null;
  const value = Number(s.replace(decimal, '.'));
  if (!Number.isFinite(value)) return null;
  return sign * (percent ? value / 100 : value);
}

export interface CellResult {
  value: Scalar;
  isFormula: boolean;
  /** Present when the formula could not be read at all. */
  syntaxError?: string;
  /** True when the formula produced several values (only the first one is shown). */
  spilled?: boolean;
}

interface Compiled {
  key: string;
  ast: Node;
  deps: string[];
}

/**
 * Recalculates every cell. Dependencies are ordered with Kahn's algorithm (no recursion, so long chains of
 * references are safe) and every cell that belongs to a cycle gets #CIRC!.
 */
export function computeSheet(cells: Record<string, string>, locale: Locale): Record<string, CellResult> {
  const results: Record<string, CellResult> = {};
  const compiled = new Map<string, Compiled>();

  for (const [key, raw] of Object.entries(cells)) {
    const input = parseInput(raw, locale);
    switch (input.kind) {
      case 'empty':
        break;
      case 'number':
      case 'bool':
      case 'text':
        results[key] = { value: input.value, isFormula: false };
        break;
      case 'formula':
        try {
          const ast = parse(input.text, { locale, mode: 'sheet' });
          const refs: { refs: CellRef[]; ranges: [CellRef, CellRef][] } = { refs: [], ranges: [] };
          collectReferences(ast, refs);
          const deps = new Set<string>();
          for (const ref of refs.refs) deps.add(cellKey(ref.col, ref.row));
          for (const [from, to] of refs.ranges) {
            for (const row of rangeKeys(from, to)) for (const dep of row) if (dep in cells) deps.add(dep);
          }
          compiled.set(key, { key, ast, deps: [...deps] });
        } catch (error) {
          const message = error instanceof FormulaSyntaxError ? error.message : 'Fórmula no válida';
          results[key] = { value: new FormulaError('#VALUE!', message), isFormula: true, syntaxError: message };
        }
        break;
    }
  }

  // Kahn's algorithm over formula cells only (constants are already resolved).
  const indegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  for (const { key, deps } of compiled.values()) {
    let count = 0;
    for (const dep of deps) {
      if (compiled.has(dep)) {
        count += 1;
        const list = dependents.get(dep) ?? [];
        list.push(key);
        dependents.set(dep, list);
      }
    }
    indegree.set(key, count);
  }
  const queue = [...compiled.keys()].filter((key) => indegree.get(key) === 0);
  const order: string[] = [];
  while (queue.length > 0) {
    const key = queue.shift() as string;
    order.push(key);
    for (const next of dependents.get(key) ?? []) {
      const remaining = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, remaining);
      if (remaining === 0) queue.push(next);
    }
  }
  const ordered = new Set(order);
  for (const key of compiled.keys()) {
    if (!ordered.has(key)) {
      results[key] = { value: new FormulaError('#CIRC!'), isFormula: true };
    }
  }

  const valueAt = (key: string): Scalar => results[key]?.value ?? null;
  for (const key of order) {
    const item = compiled.get(key) as Compiled;
    const value: Value = evaluate(item.ast, {
      resolveCell: (ref) => valueAt(cellKey(ref.col, ref.row)),
      resolveRange: (from, to) => rangeKeys(from, to).map((row) => row.map(valueAt)),
    });
    if (isMatrix(value)) {
      const spilled = value.length > 1 || (value[0]?.length ?? 0) > 1;
      results[key] = { value: value[0]?.[0] ?? null, isFormula: true, spilled };
    } else {
      results[key] = { value, isFormula: true };
    }
  }
  return results;
}

/** Validates a sheet before saving or importing it. Returns the list of problems (empty when valid). */
export function validateCells(cells: Record<string, string>): string[] {
  const problems: string[] = [];
  const keys = Object.keys(cells);
  if (keys.length > SHEET_LIMITS.cells) problems.push(`La hoja admite hasta ${SHEET_LIMITS.cells} celdas con datos.`);
  for (const key of keys) {
    const ref = parseCellRef(key);
    if (!ref || ref.absCol || ref.absRow) {
      problems.push(`«${key}» no es una celda válida.`);
      continue;
    }
    if (ref.col >= SHEET_LIMITS.cols || ref.row >= SHEET_LIMITS.rows) {
      problems.push(`La celda ${key} está fuera de la hoja (A1:Z${SHEET_LIMITS.rows}).`);
    }
    if ((cells[key] ?? '').length > SHEET_LIMITS.inputLength) {
      problems.push(`La celda ${key} supera los ${SHEET_LIMITS.inputLength} caracteres.`);
    }
  }
  return problems;
}

import type { CellFormat, Formula, Plantilla } from '../../domain/content/schemas';
import { translateFormula, type Locale } from '../../domain/formula';
import { localizeLiteral } from '../../domain/sheet/format';

/** Template cells are stored in English syntax; the lab shows them in the student's Excel language. */
export function templateToCells(template: Plantilla, locale: Locale): Record<string, string> {
  const cells: Record<string, string> = {};
  for (const [key, value] of Object.entries(template.celdas)) {
    if (typeof value === 'number') cells[key] = localizeLiteral(String(value), 'en', locale);
    else if (value.startsWith('=')) cells[key] = translateFormula(value, 'en', locale);
    else cells[key] = value;
  }
  return cells;
}

/** Builds a small sheet with the formula's example data and the example formula ready to evaluate. */
export function formulaToCells(formula: Formula, locale: Locale): { cells: Record<string, string>; formats: Record<string, CellFormat> } {
  const cells: Record<string, string> = {};
  for (const [key, value] of Object.entries(formula.ejemplo.celdas ?? {})) {
    cells[key] = typeof value === 'number' ? localizeLiteral(String(value), 'en', locale) : value;
  }
  cells.E1 = formula.nombre;
  cells.E2 = locale === 'es' ? formula.ejemplo.excel_es : formula.ejemplo.excel_en;
  cells.E3 = locale === 'es' ? `Resultado publicado: ${String(formula.ejemplo.resultado).replace('.', ',')}` : `Published result: ${formula.ejemplo.resultado}`;
  const formats: Record<string, CellFormat> = {};
  if (formula.ejemplo.unidad === 'USD') formats.E2 = 'moneda';
  return { cells, formats };
}

/** Rewrites every cell from one Excel language to the other (function names, separators and decimals). */
export function convertCells(cells: Record<string, string>, from: Locale, to: Locale): Record<string, string> {
  if (from === to) return cells;
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(cells)) {
    if (raw.trim().startsWith('=')) {
      try {
        out[key] = translateFormula(raw, from, to);
      } catch {
        out[key] = raw;
      }
    } else {
      out[key] = localizeLiteral(raw, from, to);
    }
  }
  return out;
}

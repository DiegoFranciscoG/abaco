import type { CellFormat } from '../content/schemas';
import type { SheetExport } from './types';

/** Column letter of a 0-based index: 0 → A, 25 → Z. Sheets stay within A:Z (the lab's limit). */
export function colName(index: number): string {
  if (index < 0 || index > 25) throw new RangeError('La hoja usa solo las columnas A a Z');
  return String.fromCharCode(65 + index);
}

/** Small helper to write a spreadsheet cell by cell, keeping formats and the T-13 checks together. */
export class SheetBuilder {
  private readonly cells: Record<string, string> = {};
  private readonly formats: Record<string, CellFormat> = {};
  private readonly checks: SheetExport['checks'] = [];

  /** Writes text, a number or a formula ("=…"). Text that looks like a formula is never written. */
  set(cell: string, value: string | number | null | undefined, format?: CellFormat): this {
    if (value === null || value === undefined || value === '') return this;
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) throw new RangeError(`Valor no válido en ${cell}`);
      this.cells[cell] = String(value);
    } else {
      this.cells[cell] = value;
    }
    if (format) this.formats[cell] = format;
    return this;
  }

  /** Free text the student typed (account names, details): never interpreted as a formula. */
  text(cell: string, value: string): this {
    const clean = value.trim().replace(/^=+/, '').trim();
    if (clean) this.cells[cell] = clean;
    return this;
  }

  /** Writes a formula and records that it must recalculate to `valor`. */
  check(cell: string, formula: string, valor: number, etiqueta: string, format?: CellFormat): this {
    this.set(cell, formula, format);
    this.checks.push({ cell, valor, etiqueta });
    return this;
  }

  build(): SheetExport {
    return { cells: { ...this.cells }, formats: { ...this.formats }, checks: [...this.checks] };
  }
}

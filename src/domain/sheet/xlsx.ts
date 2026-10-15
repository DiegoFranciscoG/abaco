import { read, utils, write, type CellObject, type WorkSheet } from 'xlsx';
import type { CellFormat } from '../content/schemas';
import { FormulaError, parseCellRef, translateFormula, type Locale } from '../formula';
import { formatFromXlsx, localizeLiteral, XLSX_NUMBER_FORMATS } from './format';
import { computeSheet, SHEET_LIMITS } from './sheet';

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.ods', '.csv'] as const;

export class SpreadsheetFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpreadsheetFileError';
  }
}

export interface ImportedSheet {
  cells: Record<string, string>;
  formats: Record<string, CellFormat>;
  sheetName: string;
  warnings: string[];
}

/** Checks name, extension and size before reading anything. */
export function checkSpreadsheetFile(file: { name: string; size: number }): void {
  const lower = file.name.toLowerCase();
  if (!ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    throw new SpreadsheetFileError('Solo se aceptan archivos .xlsx, .xls, .ods o .csv.');
  }
  if (file.size > MAX_IMPORT_BYTES) {
    throw new SpreadsheetFileError('El archivo supera los 5 MB permitidos.');
  }
  if (file.size === 0) throw new SpreadsheetFileError('El archivo está vacío.');
}

/** Builds a real .xlsx file. Formulas are stored in English syntax (that is how the file format saves them). */
export function exportXlsx(
  cells: Record<string, string>,
  formats: Record<string, CellFormat>,
  locale: Locale,
  sheetName = 'Hoja ÁBACO',
): Uint8Array {
  const results = computeSheet(cells, locale);
  const ws: WorkSheet = {};
  let maxCol = 0;
  let maxRow = 0;
  for (const [key, raw] of Object.entries(cells)) {
    const ref = parseCellRef(key);
    if (!ref || raw.trim() === '') continue;
    maxCol = Math.max(maxCol, ref.col);
    maxRow = Math.max(maxRow, ref.row);
    const result = results[key];
    const value = result?.value ?? null;
    const cell: CellObject = { t: 'z' };
    if (result?.isFormula) {
      cell.f = translateFormula(raw.trim(), locale, 'en').replace(/^=/, '').replace(/,\s+/g, ',');
    }
    if (value instanceof FormulaError) {
      cell.t = 'e';
      cell.w = value.code;
    } else if (typeof value === 'number') {
      cell.t = 'n';
      cell.v = value;
    } else if (typeof value === 'boolean') {
      cell.t = 'b';
      cell.v = value;
    } else if (typeof value === 'string') {
      cell.t = 's';
      cell.v = value;
    }
    const z = XLSX_NUMBER_FORMATS[formats[key] ?? 'general'];
    if (z) cell.z = z;
    ws[key] = cell;
  }
  ws['!ref'] = utils.encode_range({ s: { c: 0, r: 0 }, e: { c: maxCol, r: maxRow } });
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, sheetName.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Hoja');
  const out = write(wb, { type: 'array', bookType: 'xlsx', compression: true }) as ArrayBuffer;
  return new Uint8Array(out);
}

/** Reads the first sheet of a workbook. Nothing is uploaded: the bytes never leave the browser. */
export function importSpreadsheet(data: ArrayBuffer | Uint8Array, locale: Locale): ImportedSheet {
  let workbook;
  try {
    workbook = read(data, { type: 'array', cellFormula: true, cellNF: true, cellDates: false, dense: false });
  } catch {
    throw new SpreadsheetFileError('No se pudo leer el archivo. ¿Está dañado o protegido con contraseña?');
  }
  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheetName || !sheet) throw new SpreadsheetFileError('El archivo no tiene hojas.');
  const warnings: string[] = [];
  if (workbook.SheetNames.length > 1) {
    warnings.push(`Se importó solo la primera hoja («${sheetName}»).`);
  }
  const cells: Record<string, string> = {};
  const formats: Record<string, CellFormat> = {};
  let skipped = 0;
  for (const [address, cell] of Object.entries(sheet)) {
    if (address.startsWith('!')) continue;
    const ref = parseCellRef(address);
    const c = cell as CellObject;
    if (!ref || ref.col >= SHEET_LIMITS.cols || ref.row >= SHEET_LIMITS.rows) {
      skipped += 1;
      continue;
    }
    if (Object.keys(cells).length >= SHEET_LIMITS.cells) {
      skipped += 1;
      continue;
    }
    let raw: string | null = null;
    if (c.f) {
      try {
        raw = translateFormula(`=${c.f}`, 'en', locale);
      } catch {
        raw = `=${c.f}`;
        warnings.push(`La fórmula de ${address} usa algo que ÁBACO no reconoce; revísala.`);
      }
    } else if (c.t === 'n' && typeof c.v === 'number') {
      raw = localizeLiteral(String(c.v), 'en', locale);
    } else if (c.t === 'b') {
      raw = locale === 'es' ? (c.v ? 'VERDADERO' : 'FALSO') : c.v ? 'TRUE' : 'FALSE';
    } else if (c.t === 's' && typeof c.v === 'string') {
      raw = c.v.slice(0, SHEET_LIMITS.inputLength);
    }
    if (raw !== null && raw !== '') {
      cells[address] = raw;
      const format = formatFromXlsx(typeof c.z === 'string' ? c.z : undefined);
      if (format !== 'general') formats[address] = format;
    }
  }
  if (skipped > 0) {
    warnings.push(`Se omitieron ${skipped} celdas fuera del área A1:Z${SHEET_LIMITS.rows} o del límite de ${SHEET_LIMITS.cells} celdas.`);
  }
  return { cells, formats, sheetName, warnings };
}

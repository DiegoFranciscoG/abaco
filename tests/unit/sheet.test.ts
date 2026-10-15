import { read } from 'xlsx';
import { describe, expect, it } from 'vitest';
import { FormulaError } from '../../src/domain/formula';
import { formatFromXlsx, formatValue, localizeLiteral } from '../../src/domain/sheet/format';
import { computeSheet, parseInput, parseLocaleNumber, validateCells } from '../../src/domain/sheet/sheet';
import { applySuggestion, currentFunctionPrefix, suggestFunctions } from '../../src/domain/sheet/suggest';
import {
  checkSpreadsheetFile,
  exportXlsx,
  importSpreadsheet,
  SpreadsheetFileError,
} from '../../src/domain/sheet/xlsx';

const valueOf = (cells: Record<string, string>, key: string, locale: 'es' | 'en' = 'es') =>
  computeSheet(cells, locale)[key]?.value;

describe('cell input', () => {
  it.each([
    ['', 'es', { kind: 'empty' }],
    ['=A1+1', 'es', { kind: 'formula', text: '=A1+1' }],
    ['1500', 'es', { kind: 'number', value: 1500 }],
    ['1500,75', 'es', { kind: 'number', value: 1500.75 }],
    ['1.234.567,8', 'es', { kind: 'number', value: 1234567.8 }],
    ['1500.75', 'es', { kind: 'number', value: 1500.75 }],
    ['12%', 'es', { kind: 'number', value: 0.12 }],
    ['-$250', 'es', { kind: 'number', value: -250 }],
    ['1,234.5', 'en', { kind: 'number', value: 1234.5 }],
    ['verdadero', 'es', { kind: 'bool', value: true }],
    ['Caja', 'es', { kind: 'text', value: 'Caja' }],
    ['=', 'es', { kind: 'text', value: '=' }],
  ] as const)('«%s» (%s)', (raw, locale, expected) => {
    expect(parseInput(raw, locale)).toEqual(expected);
  });

  it('rejects malformed numbers', () => {
    expect(parseLocaleNumber('1,2,3', 'es')).toBeNull();
    expect(parseLocaleNumber('abc', 'en')).toBeNull();
  });
});

describe('recalculation', () => {
  it('follows dependencies in any order', () => {
    const cells = { C1: '=B1*2', B1: '=A1+1', A1: '10' };
    expect(valueOf(cells, 'C1')).toBe(22);
  });

  it('marks every cell of a cycle with #CIRC! and propagates it', () => {
    const results = computeSheet({ A1: '=B1', B1: '=A1', C1: '=A1+1', D1: '5' }, 'es');
    expect((results.A1?.value as FormulaError).code).toBe('#CIRC!');
    expect((results.B1?.value as FormulaError).code).toBe('#CIRC!');
    expect((results.C1?.value as FormulaError).code).toBe('#CIRC!');
    expect(results.D1?.value).toBe(5);
  });

  it('detects self references', () => {
    expect((valueOf({ A1: '=A1+1' }, 'A1') as FormulaError).code).toBe('#CIRC!');
  });

  it('handles long chains without recursion limits', () => {
    const cells: Record<string, string> = { A1: '1' };
    for (let r = 2; r <= 200; r += 1) cells[`A${r}`] = `=A${r - 1}+1`;
    for (let r = 1; r <= 200; r += 1) cells[`B${r}`] = r === 1 ? '=A200' : `=B${r - 1}+1`;
    expect(valueOf(cells, 'B200')).toBe(399);
  });

  it('reports syntax errors per cell without breaking the rest', () => {
    const results = computeSheet({ A1: '=1+', B1: '=2*3' }, 'es');
    expect(results.A1?.syntaxError).toMatch(/termina/);
    expect(results.B1?.value).toBe(6);
  });

  it('shows the first value of array results and flags the spill', () => {
    const results = computeSheet({ A1: '1', A2: '2', B1: '=A1:A2*10' }, 'es');
    expect(results.B1).toMatchObject({ value: 10, spilled: true });
  });

  it('ranges depend on every filled cell inside them', () => {
    const cells = { A1: '=SUMA(B1:B3)', B1: '1', B2: '=B1+1', B3: '=B2+1' };
    expect(valueOf(cells, 'A1')).toBe(6);
  });

  it('validates sheet bounds', () => {
    expect(validateCells({ A1: '1' })).toEqual([]);
    expect(validateCells({ AA1: '1' })[0]).toMatch(/fuera/);
    expect(validateCells({ $A1: '1' } as Record<string, string>)[0]).toMatch(/no es una celda/);
    expect(validateCells({ A1: 'x'.repeat(2001) })[0]).toMatch(/2000/);
  });
});

describe('formatting', () => {
  it('formats currency, percent and numbers in Ecuadorian Spanish', () => {
    expect(formatValue(1234.5, 'moneda', 'es')).toMatch(/1\.234,50/);
    expect(formatValue(0.1234, 'porcentaje', 'es')).toMatch(/12,34/);
    expect(formatValue(1234.567, 'numero', 'es')).toBe('1.234,57');
    expect(formatValue(1234.567, 'entero', 'en')).toBe('1,235');
    expect(formatValue(0.1 + 0.2, 'general', 'es')).toBe('0,3');
  });

  it('formats errors with their Spanish Excel spelling', () => {
    expect(formatValue(new FormulaError('#DIV/0!'), 'general', 'es')).toBe('#¡DIV/0!');
    expect(formatValue(new FormulaError('#NAME?'), 'general', 'en')).toBe('#NAME?');
    expect(formatValue(true, 'general', 'es')).toBe('VERDADERO');
    expect(formatValue(null)).toBe('');
  });

  it('converts literals between locales', () => {
    expect(localizeLiteral('1.5', 'en', 'es')).toBe('1,5');
    expect(localizeLiteral('=A1*1.5', 'en', 'es')).toBe('=A1*1.5');
    expect(localizeLiteral('Caja', 'en', 'es')).toBe('Caja');
  });

  it('maps xlsx number formats back', () => {
    expect(formatFromXlsx('"$"#,##0.00')).toBe('moneda');
    expect(formatFromXlsx('0.00%')).toBe('porcentaje');
    expect(formatFromXlsx('0')).toBe('entero');
    expect(formatFromXlsx('#,##0.00')).toBe('numero');
    expect(formatFromXlsx(undefined)).toBe('general');
  });
});

describe('formula assistant', () => {
  it('finds the function being typed', () => {
    expect(currentFunctionPrefix('=SUMA(A1:A3)+PRO')).toBe('PRO');
    expect(currentFunctionPrefix('texto')).toBeNull();
  });

  it('suggests Spanish names first in a Spanish sheet and accepts English prefixes', () => {
    const es = suggestFunctions('=PA', 'es');
    expect(es[0]?.label).toBe('PAGO');
    expect(suggestFunctions('=PM', 'es').some((s) => s.label === 'PAGO')).toBe(true);
    expect(suggestFunctions('=PM', 'en')[0]?.label).toBe('PMT');
  });

  it('inserts the chosen function', () => {
    const [first] = suggestFunctions('=1+VN', 'es');
    expect(applySuggestion('=1+VN', first!)).toBe('=1+VNA(');
  });
});

describe('xlsx files', () => {
  it('validates file name, type and size before reading', () => {
    expect(() => checkSpreadsheetFile({ name: 'virus.exe', size: 10 })).toThrow(SpreadsheetFileError);
    expect(() => checkSpreadsheetFile({ name: 'grande.xlsx', size: 6 * 1024 * 1024 })).toThrow(/5 MB/);
    expect(() => checkSpreadsheetFile({ name: 'vacio.csv', size: 0 })).toThrow(/vacío/);
    expect(() => checkSpreadsheetFile({ name: 'Taller.XLSX', size: 1000 })).not.toThrow();
  });

  it('reads unknown bytes as plain text at most, never as formulas', () => {
    const garbage = importSpreadsheet(new Uint8Array([0, 159, 146, 150, 1, 2, 3]), 'es');
    expect(Object.values(garbage.cells).some((v) => v.startsWith('='))).toBe(false);
  });

  it('writes formulas in English syntax inside the file and reads them back in Spanish', () => {
    const bytes = exportXlsx({ A1: '1000', A2: '=REDONDEAR(A1*0,15;2)' }, { A2: 'moneda' }, 'es');
    const wb = read(bytes, { type: 'array', cellFormula: true });
    const ws = wb.Sheets[wb.SheetNames[0]!]!;
    expect(ws.A2?.f).toBe('ROUND(A1*0.15,2)');
    expect(ws.A2?.v).toBe(150);
    const back = importSpreadsheet(bytes, 'es');
    expect(back.cells.A2).toBe('=REDONDEAR(A1*0,15; 2)');
    expect(back.formats.A2).toBe('moneda');
  });
});

/** T-07: a sheet with 30 formulas survives a download/re-open round trip and matches hand calculations. */
describe('T-07: spreadsheet fidelity', () => {
  const cells: Record<string, string> = {
    A1: '1000', A2: '0,01', A3: '12', A4: '0,1', A5: '5', A6: '-1000', A7: '300', A8: '400', A9: '500', A10: 'Caja',
    B1: '=A1*(1+A2)^A3',
    B2: '=VA(A2;A3;-100)',
    B3: '=PAGO(A2;A3;-A1)',
    B4: '=VF(A4;A5;0;-A1)',
    B5: '=VNA(A4;A7:A9)+A6',
    B6: '=TIR(A6:A9)',
    B7: '=PAGOINT(A2;1;A3;-A1)',
    B8: '=PAGOPRIN(A2;1;A3;-A1)',
    B9: '=SLN(10000;1000;5)',
    B10: '=SYD(10000;1000;5;1)',
    B11: '=DDB(10000;1000;5;1)',
    B12: '=INT.EFECTIVO(0,12;12)',
    B13: '=TASA.NOMINAL(B12;12)',
    B14: '=NPER(A4;0;-A1;2*A1)',
    B15: '=TASA(A5;0;-A1;2*A1)',
    B16: '=SUMA(A7:A9)',
    B17: '=PROMEDIO(A7:A9)',
    B18: '=MEDIANA(A7:A9)',
    B19: '=DESVEST.M(A7:A9)',
    B20: '=VAR.P(A7:A9)',
    B21: '=MAX(A7:A9)-MIN(A7:A9)',
    B22: '=CONTAR(A1:A10)',
    B23: '=CONTARA(A1:A10)',
    B24: '=SI(B5>0;"Aceptar";"Rechazar")',
    B25: '=REDONDEAR(B2;2)',
    B26: '=SUMAPRODUCTO(A7:A9;A7:A9)',
    B27: '=RAIZ(A7)',
    B28: '=ABS(A6)/A5',
    B29: '=SI.ERROR(A1/0;-1)',
    B30: '=A10&" inicial"',
  };
  const i = 0.01;
  const handValues: Record<string, number | string> = {
    B1: 1000 * 1.01 ** 12,
    B2: (100 * (1 - (1 + i) ** -12)) / i,
    B3: (1000 * i) / (1 - (1 + i) ** -12),
    B4: 1000 * 1.1 ** 5,
    B5: 300 / 1.1 + 400 / 1.1 ** 2 + 500 / 1.1 ** 3 - 1000,
    B7: 1000 * i,
    B8: (1000 * i) / (1 - (1 + i) ** -12) - 1000 * i,
    B9: 1800,
    B10: 3000,
    B11: 4000,
    B12: 1.01 ** 12 - 1,
    B13: 0.12,
    B14: Math.log(2) / Math.log(1.1),
    B15: 2 ** (1 / 5) - 1,
    B16: 1200,
    B17: 400,
    B18: 400,
    B19: 100,
    B20: 20000 / 3,
    B21: 200,
    B22: 9,
    B23: 10,
    B24: 'Rechazar',
    B25: 1125.51,
    B26: 500000,
    B27: Math.sqrt(300),
    B28: 200,
    B29: -1,
    B30: 'Caja inicial',
  };

  it('has 30 formulas', () => {
    expect(Object.values(cells).filter((v) => v.startsWith('='))).toHaveLength(30);
  });

  it('matches values calculated by hand', () => {
    const results = computeSheet(cells, 'es');
    for (const [key, expected] of Object.entries(handValues)) {
      const actual = results[key]?.value;
      if (typeof expected === 'number') expect(actual, key).toBeCloseTo(expected, 8);
      else expect(actual, key).toBe(expected);
    }
    const irr = results.B6?.value as number;
    expect(-1000 + 300 / (1 + irr) + 400 / (1 + irr) ** 2 + 500 / (1 + irr) ** 3).toBeCloseTo(0, 6);
  });

  it('download → re-open gives exactly the same values', () => {
    const original = computeSheet(cells, 'es');
    const bytes = exportXlsx(cells, { B2: 'moneda', A2: 'porcentaje' }, 'es', 'T-07');
    const reopened = importSpreadsheet(bytes, 'es');
    expect(Object.keys(reopened.cells).sort()).toEqual(Object.keys(cells).sort());
    const recomputed = computeSheet(reopened.cells, 'es');
    for (const key of Object.keys(cells)) {
      const a = original[key]?.value;
      const b = recomputed[key]?.value;
      if (typeof a === 'number') expect(b, key).toBeCloseTo(a, 10);
      else expect(b, key).toEqual(a);
    }
    expect(reopened.formats.B2).toBe('moneda');
  });

  it('the same file opens identically with English syntax', () => {
    const bytes = exportXlsx(cells, {}, 'es');
    const english = importSpreadsheet(bytes, 'en');
    expect(english.cells.B3).toBe('=PMT(A2,A3,-A1)');
    const results = computeSheet(english.cells, 'en');
    expect(results.B25?.value).toBe(1125.51);
  });
});

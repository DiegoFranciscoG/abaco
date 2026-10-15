import { describe, expect, it } from 'vitest';
import {
  asNumber,
  compactFormula,
  evaluateAlgebra,
  evaluateExcel,
  FormulaError,
  FormulaSyntaxError,
  isClose,
  parse,
  tokenize,
  translateFormula,
  tryEvaluateAlgebra,
} from '../../src/domain/formula';

const num = (value: ReturnType<typeof evaluateExcel>) => {
  const n = asNumber(value);
  if (n instanceof FormulaError) throw new Error(`Se esperaba número y llegó ${n.code}`);
  return n;
};

describe('tokenizer', () => {
  it('reads numbers with the decimal separator of each locale', () => {
    expect(tokenize('=1.5+2', 'en').map((t) => t.value)).toEqual(['1.5', '+', '2', '']);
    expect(tokenize('=1,5+2', 'es').map((t) => t.value)).toEqual(['1.5', '+', '2', '']);
  });

  it('reads scientific notation', () => {
    expect(num(evaluateExcel('=1E3+2.5e-1'))).toBe(1000.25);
  });

  it('reads strings with escaped quotes', () => {
    expect(evaluateExcel('="dijo ""hola"""')).toBe('dijo "hola"');
  });

  it('rejects an unclosed string with a helpful message', () => {
    expect(() => tokenize('="hola')).toThrow(/comillas/);
  });

  it('suggests switching to Spanish syntax when it finds a semicolon', () => {
    expect(() => tokenize('=SUMA(1;2)', 'en')).toThrow(/español/);
  });

  it('recognizes Spanish booleans', () => {
    expect(evaluateExcel('=VERDADERO', {}, 'es')).toBe(true);
    expect(evaluateExcel('=FALSO', {}, 'es')).toBe(false);
  });
});

describe('operator precedence (same as Excel)', () => {
  it.each([
    ['=1+2*3', 7],
    ['=(1+2)*3', 9],
    ['=2^3^2', 64], // Excel is left-associative
    ['=-2^2', 4], // negation binds tighter than ^ in Excel
    ['=-(2^2)', -4],
    ['=2^-1', 0.5],
    ['=10-2-3', 5],
    ['=100/10/2', 5],
    ['=50%*200', 100],
    ['=-5%', -0.05],
    ['=1+--1', 2],
  ])('%s = %d', (formula, expected) => {
    expect(num(evaluateExcel(formula))).toBeCloseTo(expected, 12);
  });

  it('evaluates comparisons after arithmetic', () => {
    expect(evaluateExcel('=1+1=2')).toBe(true);
    expect(evaluateExcel('=3>2*2')).toBe(false);
    expect(evaluateExcel('=2<>2')).toBe(false);
    expect(evaluateExcel('=2<=2')).toBe(true);
  });

  it('concatenates text with &', () => {
    expect(evaluateExcel('="Total: "&10+5')).toBe('Total: 15');
  });

  it('compares text without case or accents differences mattering for equality', () => {
    expect(evaluateExcel('="activo"="ACTIVO"')).toBe(true);
  });
});

describe('errors', () => {
  it('returns #DIV/0! when dividing by zero or an empty cell', () => {
    expect((evaluateExcel('=1/0') as FormulaError).code).toBe('#DIV/0!');
    expect((evaluateExcel('=10/B1', {}) as FormulaError).code).toBe('#DIV/0!');
  });

  it('returns #NAME? for unknown functions and unknown variables', () => {
    expect((evaluateExcel('=NOEXISTE(1)') as FormulaError).code).toBe('#NAME?');
    expect((evaluateAlgebra('a+1', {}) as FormulaError).code).toBe('#NAME?');
  });

  it('returns #VALUE! when text is used as a number', () => {
    expect((evaluateExcel('="abc"*2') as FormulaError).code).toBe('#VALUE!');
  });

  it('accepts numeric text like Excel', () => {
    expect(num(evaluateExcel('="3"+1'))).toBe(4);
  });

  it('propagates the first error through operations and functions', () => {
    expect((evaluateExcel('=SUM(1/0,2)') as FormulaError).code).toBe('#DIV/0!');
    expect((evaluateExcel('=A1+1', { A1: '#x' }) as FormulaError).code).toBe('#VALUE!');
  });

  it('returns #NUM! for impossible powers', () => {
    expect((evaluateExcel('=(-8)^0.5') as FormulaError).code).toBe('#NUM!');
    expect((evaluateExcel('=0^-1') as FormulaError).code).toBe('#DIV/0!');
  });

  it('throws a syntax error with position for malformed formulas', () => {
    expect(() => parse('=1+')).toThrow(FormulaSyntaxError);
    expect(() => parse('=(1+2')).toThrow(/paréntesis/);
    expect(() => parse('=1 2')).toThrow(/Sobra/);
    expect(() => parse('=12abc')).toThrow(/Número/);
  });
});

describe('cells and ranges', () => {
  const cells = { A1: 10, A2: 20, A3: 30, B1: 2, B2: 'texto' };

  it('reads single cells, absolute references included', () => {
    expect(num(evaluateExcel('=A1*B1', cells))).toBe(20);
    expect(num(evaluateExcel('=$A$1+A$2+$A3', cells))).toBe(60);
  });

  it('sums ranges ignoring text and empty cells', () => {
    expect(num(evaluateExcel('=SUM(A1:A3)', cells))).toBe(60);
    expect(num(evaluateExcel('=SUM(A1:B3)', cells))).toBe(62);
    expect(num(evaluateExcel('=AVERAGE(A1:A4)', cells))).toBe(20);
    expect(num(evaluateExcel('=COUNT(A1:B3)', cells))).toBe(4);
  });

  it('accepts reversed ranges', () => {
    expect(num(evaluateExcel('=SUM(A3:A1)', cells))).toBe(60);
  });

  it('does elementwise arithmetic on ranges (dynamic arrays)', () => {
    expect(num(evaluateExcel('=SUM(A1:A3*2)', cells))).toBe(120);
    expect(num(evaluateExcel('=SUMPRODUCT(A1:A3,A1:A3)', cells))).toBe(1400);
  });
});

describe('Spanish Excel syntax', () => {
  it('evaluates Spanish function names with ; and decimal comma', () => {
    expect(num(evaluateExcel('=REDONDEAR(VA(0,01;12;-100);2)', {}, 'es'))).toBe(1125.51);
    expect(num(evaluateExcel('=SUMA(1;2;3,5)', {}, 'es'))).toBe(6.5);
    expect(evaluateExcel('=SI(Y(1>0;2>1);"sí";"no")', {}, 'es')).toBe('sí');
  });

  it('accepts English names even in Spanish syntax (Google Sheets habit)', () => {
    expect(num(evaluateExcel('=SUM(1;2)', {}, 'es'))).toBe(3);
  });

  it('rejects array constants in Spanish syntax with a clear message', () => {
    expect(() => parse('={1;2}', { locale: 'es' })).toThrow(/matrices constantes/);
  });

  it('translates formulas between locales both ways', () => {
    const en = '=PMT(0.01, 12, 10000)';
    const es = translateFormula(en, 'en', 'es');
    expect(es).toBe('=PAGO(0,01; 12; 10000)');
    expect(compactFormula(translateFormula(es, 'es', 'en'))).toBe(compactFormula(en));
    expect(translateFormula('=IF(A1>0,TRUE,"x")', 'en', 'es')).toBe('=SI(A1>0; VERDADERO; "x")');
  });

  it('leaves text inside quotes untouched when translating', () => {
    expect(translateFormula('="SUM, total"&SUM(1,2)', 'en', 'es')).toBe('="SUM, total"&SUMA(1; 2)');
  });
});

describe('array constants (English syntax)', () => {
  it('reads row and column arrays', () => {
    expect(num(evaluateExcel('=SUM({1,2,3})'))).toBe(6);
    expect(num(evaluateExcel('=SUM({1;2;3})'))).toBe(6);
    expect(num(evaluateExcel('=SUM({1,2;3,4})'))).toBe(10);
  });

  it('rejects ragged arrays', () => {
    expect(() => parse('={1,2;3}')).toThrow(/mismo número/);
  });
});

describe('logical functions', () => {
  it('evaluates IF lazily (the unused branch may contain an error)', () => {
    expect(num(evaluateExcel('=IF(TRUE,1,1/0)'))).toBe(1);
    expect(evaluateExcel('=IF(FALSE,1)')).toBe(false);
  });

  it('IFERROR replaces errors', () => {
    expect(evaluateExcel('=IFERROR(1/0,"sin dato")')).toBe('sin dato');
    expect(num(evaluateExcel('=IFERROR(4/2,0)'))).toBe(2);
  });

  it('IFS returns the first true branch', () => {
    expect(evaluateExcel('=IFS(1>2,"a",2>1,"b")')).toBe('b');
    expect((evaluateExcel('=IFS(1>2,"a")') as FormulaError).code).toBe('#N/A');
  });

  it('AND, OR and NOT', () => {
    expect(evaluateExcel('=AND(TRUE,1)')).toBe(true);
    expect(evaluateExcel('=OR(FALSE,0)')).toBe(false);
    expect(evaluateExcel('=NOT(0)')).toBe(true);
  });
});

describe('financial functions match hand calculations', () => {
  it('PV of an ordinary annuity: 100 · (1 − 1.01^−12) / 0.01', () => {
    const expected = (100 * (1 - 1.01 ** -12)) / 0.01;
    expect(num(evaluateExcel('=PV(0.01,12,-100)'))).toBeCloseTo(expected, 9);
  });

  it('PMT of a loan: P·i / (1 − (1+i)^−n)', () => {
    const expected = (10000 * 0.01) / (1 - 1.01 ** -12);
    expect(num(evaluateExcel('=PMT(0.01,12,-10000)'))).toBeCloseTo(expected, 9);
  });

  it('FV of a lump sum', () => {
    expect(num(evaluateExcel('=FV(0.05,10,0,-1000)'))).toBeCloseTo(1000 * 1.05 ** 10, 9);
  });

  it('NPV discounts from period 1 and IRR makes NPV zero', () => {
    const npv = num(evaluateExcel('=NPV(0.1,300,400,500)'));
    expect(npv).toBeCloseTo(300 / 1.1 + 400 / 1.1 ** 2 + 500 / 1.1 ** 3, 9);
    const irr = num(evaluateExcel('=IRR(B1:B4)', { B1: -1000, B2: 300, B3: 400, B4: 500 }));
    expect(-1000 + 300 / (1 + irr) + 400 / (1 + irr) ** 2 + 500 / (1 + irr) ** 3).toBeCloseTo(0, 6);
  });

  it('omitted middle arguments count as zero', () => {
    expect(num(evaluateExcel('=PV(0.1,5,,1000)'))).toBeCloseTo(-1000 / 1.1 ** 5, 9);
  });

  it('depreciation functions', () => {
    expect(num(evaluateExcel('=SLN(10000,1000,5)'))).toBe(1800);
    expect(num(evaluateExcel('=SYD(10000,1000,5,1)'))).toBe(3000);
    expect(num(evaluateExcel('=DDB(10000,1000,5,1)'))).toBe(4000);
  });

  it('effective and nominal rates are inverse', () => {
    const effective = num(evaluateExcel('=EFFECT(0.12,12)'));
    expect(effective).toBeCloseTo(1.01 ** 12 - 1, 12);
    expect(num(evaluateExcel(`=NOMINAL(${effective},12)`))).toBeCloseTo(0.12, 12);
  });
});

describe('statistical functions', () => {
  const data = { A1: 2, A2: 4, A3: 4, A4: 4, A5: 5, A6: 5, A7: 7, A8: 9 };
  it('mean, median, mode', () => {
    expect(num(evaluateExcel('=AVERAGE(A1:A8)', data))).toBe(5);
    expect(num(evaluateExcel('=MEDIAN(A1:A8)', data))).toBe(4.5);
    expect(num(evaluateExcel('=MODE.SNGL(A1:A8)', data))).toBe(4);
  });

  it('sample and population standard deviation', () => {
    expect(num(evaluateExcel('=STDEV.P(A1:A8)', data))).toBeCloseTo(2, 12);
    expect(num(evaluateExcel('=STDEV.S(A1:A8)', data))).toBeCloseTo(Math.sqrt(32 / 7), 12);
    expect(num(evaluateExcel('=DESVEST.M(A1:A8)', data, 'es'))).toBeCloseTo(Math.sqrt(32 / 7), 12);
  });
});

describe('algebra mode (content expressions)', () => {
  it('uses variable names, including names that look like cells', () => {
    expect(num(evaluateAlgebra('FC1/(1+r)^1', { FC1: 110, r: 0.1 }))).toBeCloseTo(100, 12);
    expect(num(evaluateAlgebra('VF/(1+i)^n', { VF: 1210, i: 0.1, n: 2 }))).toBeCloseTo(1000, 9);
  });

  it('accepts lists for statistics', () => {
    const x = [2, 4, 4, 4, 5, 5, 7, 9];
    expect(num(evaluateAlgebra('SUM((x-AVERAGE(x))^2)/(COUNT(x)-1)', { x }))).toBeCloseTo(32 / 7, 12);
  });

  it('tryEvaluateAlgebra never throws', () => {
    expect(tryEvaluateAlgebra('1+', {})).toEqual({ ok: false, message: expect.stringMatching(/termina/) });
    expect(tryEvaluateAlgebra('1/0', {})).toEqual({ ok: false, message: '#DIV/0!' });
    expect(tryEvaluateAlgebra('2*a', { a: 3 })).toEqual({ ok: true, value: 6 });
  });

  it('isClose respects the declared tolerance', () => {
    expect(isClose(100.004, 100, 0.005)).toBe(true);
    expect(isClose(100.006, 100, 0.005)).toBe(false);
  });
});

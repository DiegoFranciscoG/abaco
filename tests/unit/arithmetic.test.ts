import { describe, expect, it } from 'vitest';
import { checkArithmetic, evaluatePlain, parseEsNumber } from '../../src/domain/content/arithmetic';

describe('aritmética de los ejemplos', () => {
  it('reads Ecuadorian numbers and plain operations', () => {
    expect(parseEsNumber('1.234,56')).toBe(1234.56);
    expect(evaluatePlain('(30.000 + 33.000) ÷ 120.000')).toBe(0.525);
    expect(evaluatePlain('2 × (3 − 1)')).toBe(4);
    expect(evaluatePlain('2 × abc')).toBeNull();
  });

  it('finds a wrong result and accepts a correctly rounded one', () => {
    expect(checkArithmetic('El IVA es 2.000 × 1,5 = 3.100 dólares.')).toHaveLength(1);
    expect(
      checkArithmetic('Excedente = 21.732 − 20.188 = 1.544; impuesto = 631 + 1.544 × 0,12 = USD 816,28.'),
    ).toEqual([]);
    expect(checkArithmetic('10 ÷ 3 = 3,33 y también 10 ÷ 3 = 3,3')).toEqual([]);
    expect(checkArithmetic('10 ÷ 3 = 3,4')).toEqual([
      { expresion: '10 ÷ 3 = 3,4', escrito: 3.4, calculado: 10 / 3 },
    ]);
  });

  it('compares results written as percentages', () => {
    expect(checkArithmetic('margen bruto 9.450 ÷ 23.750 = 39,79 %')).toEqual([]);
    expect(checkArithmetic('margen bruto 9.450 ÷ 23.750 = 39,70 %')).toHaveLength(1);
  });

  it('leaves alone chains that are part of a bigger expression', () => {
    expect(checkArithmetic('1.000 × e^(0,05 × 3) = USD 1.161,83')).toEqual([]);
    expect(checkArithmetic('t = ln 2 ÷ 0,05 = 13,86 años')).toEqual([]);
    expect(checkArithmetic('120 ± 1,96 × 15 ÷ 7 = 120 ± 4,2')).toEqual([]);
    expect(checkArithmetic('(1 + 0,12 ÷ 12)^12 − 1 = 12,68 %')).toEqual([]);
  });
});

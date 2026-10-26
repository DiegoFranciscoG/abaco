import { describe, expect, it } from 'vitest';
import {
  cifraValor,
  getCifra,
  NORMATIVA,
  percentLabel,
  requireCifra,
} from '../../src/domain/content/normativa';
import { detectCifras, isoDay, vigenciaStatus } from '../../src/domain/content/vigencia';
import { computePayroll, DEFAULT_PAYROLL, IESS_PERSONAL, SBU_VIGENTE } from '../../src/domain/tools/payroll';
import { IR_PERSONAS, IVA_TARIFA_GENERAL, rimpeTax } from '../../src/domain/tools/tax';

const year2026 = { desde: '2026-01-01', hasta: '2026-12-31', ejercicio_fiscal: 2026 };

describe('vigencia of a normative figure', () => {
  it('is in force while more than 60 days remain', () => {
    expect(vigenciaStatus(year2026, '2026-10-26')).toEqual({ estado: 'vigente', dias: 66 });
    expect(vigenciaStatus(year2026, '2026-11-01')).toEqual({ estado: 'vigente', dias: 60 });
  });

  it('is announced for review in its last 60 days, including the last one', () => {
    expect(vigenciaStatus(year2026, '2026-11-02')).toEqual({ estado: 'por-vencer', dias: 59 });
    expect(vigenciaStatus(year2026, '2026-12-31')).toEqual({ estado: 'por-vencer', dias: 0 });
  });

  it('is expired from the first day after it ends (January for a 2026 figure)', () => {
    expect(vigenciaStatus(year2026, '2027-01-01')).toEqual({ estado: 'vencida', dias: -1 });
    expect(vigenciaStatus(year2026, '2027-03-15').estado).toBe('vencida');
  });

  it('uses the local calendar day', () => {
    expect(isoDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(isoDay(new Date(2026, 11, 31, 0, 1))).toBe('2026-12-31');
  });
});

describe('detection of figures in a text', () => {
  it('finds the SBU only as a whole amount', () => {
    expect(detectCifras('El SBU de USD 482 en 2026.', NORMATIVA)).toContain('sbu');
    expect(detectCifras('482 ÷ 12 × 6 = USD 241', NORMATIVA)).toContain('sbu');
    expect(detectCifras('Cuotas acumuladas = 7.482,67', NORMATIVA)).not.toContain('sbu');
  });

  it('finds the IVA rate only next to the word IVA', () => {
    expect(detectCifras('un IVA de 15 % sobre la celda C2', NORMATIVA)).toContain('iva-tarifa-general');
    expect(detectCifras('su base es 46 ÷ 1,15 = USD 40', NORMATIVA)).toContain('iva-tarifa-general');
    expect(detectCifras('Una alternativa rinde 15 % al año.', NORMATIVA)).not.toContain('iva-tarifa-general');
    expect(detectCifras('ROE = 0,15 (15 %)', NORMATIVA)).toEqual([]);
  });

  it('finds the income tax table by its bracket limits', () => {
    expect(detectCifras('hasta la fracción básica desgravada (USD 12 208 en 2026)', NORMATIVA)).toEqual([
      'ir-personas-tabla',
    ]);
    expect(detectCifras('el tramo empieza en 20.188', NORMATIVA)).toEqual(['ir-personas-tabla']);
  });

  it('does not confuse a balance sheet amount with the RIMPE limit', () => {
    expect(detectCifras('pasivos por 300.000 y patrimonio de 200.000', NORMATIVA)).toEqual([]);
    expect(detectCifras('emprendedores (ingresos brutos de hasta USD 300 000)', NORMATIVA)).toContain(
      'rimpe-limites',
    );
  });
});

describe('the calculators read their figures from the catalog', () => {
  it('payroll uses the SBU and the IESS rates of content/normativa.json', () => {
    expect(SBU_VIGENTE).toBe(cifraValor('sbu'));
    expect(DEFAULT_PAYROLL.sbu).toBe(cifraValor('sbu'));
    expect(IESS_PERSONAL).toBeCloseTo(cifraValor('iess-aporte-personal') / 100, 10);
    const result = computePayroll({ ...DEFAULT_PAYROLL, sueldo: 1000, horasSuplementarias: 2 });
    expect(result.descuentos[0]?.concepto).toBe(`Aporte personal al IESS (${percentLabel(9.45)})`);
    // 1 000 ÷ 240 × 1,5 × 2 = 12,50 of overtime with the 50 % surcharge of art. 55.
    expect(result.ingresos[1]).toMatchObject({ valor: 12.5, concepto: 'Horas suplementarias (2 h al 50 %)' });
  });

  it('tax uses the IVA rate, the income tax table and the RIMPE limits of the catalog', () => {
    expect(IVA_TARIFA_GENERAL).toBeCloseTo(cifraValor('iva-tarifa-general') / 100, 10);
    expect(IR_PERSONAS).toHaveLength(requireCifra('ir-personas-tabla').tramos?.length ?? -1);
    expect(IR_PERSONAS[1]).toEqual({ desde: 12_208, hasta: 15_549, impuestoFraccion: 0, porcentaje: 0.05 });
    expect(rimpeTax(cifraValor('rimpe-limites') + 1, false)).toEqual({ regimen: 'fuera', impuesto: null });
    expect(rimpeTax(20_000, true)).toEqual({ regimen: 'negocio-popular', impuesto: 60 });
  });

  it('a missing figure is a loud error, never a silent default', () => {
    expect(getCifra('no-existe')).toBeUndefined();
    expect(() => requireCifra('no-existe')).toThrow(/content\/normativa\.json/);
    expect(() => cifraValor('ir-personas-tabla')).toThrow(/no es un valor único/);
  });

  it('formats percentages with a decimal comma', () => {
    expect(percentLabel(9.45)).toBe('9,45 %');
    expect(percentLabel(15)).toBe('15 %');
  });
});

import { describe, expect, it } from 'vitest';
import { DELIVERABLES } from '../../src/domain/deliverables/catalog';
import {
  amortizationRows,
  amortizacion,
  type AmortizacionInput,
} from '../../src/domain/deliverables/amortizacion';
import {
  depreciacion,
  depreciationRows,
  type DepreciacionInput,
} from '../../src/domain/deliverables/depreciacion';
import { evaluacionProyecto, type EvaluacionInput } from '../../src/domain/deliverables/evaluacion-proyecto';
import { kardex, runKardex, type KardexInput } from '../../src/domain/deliverables/kardex';
import { libroDiario, runJournal, type LibroDiarioInput } from '../../src/domain/deliverables/libro-diario';
import { puntoEquilibrio, type PuntoEquilibrioInput } from '../../src/domain/deliverables/punto-equilibrio';
import { razonesFinancieras, type RazonesInput } from '../../src/domain/deliverables/razones-financieras';
import { DEFINITIONS } from '../../src/domain/deliverables/registry';
import { rolPagos, runPayroll, type RolPagosInput } from '../../src/domain/deliverables/rol-pagos';
import {
  DeliverableError,
  type DeliverableDefinition,
  type DeliverableResult,
} from '../../src/domain/deliverables/types';
import { asNumber, evaluateExcel, FormulaError } from '../../src/domain/formula';
import { computeSheet } from '../../src/domain/sheet/sheet';
import { exportXlsx, importSpreadsheet } from '../../src/domain/sheet/xlsx';

const value = (r: DeliverableResult, etiqueta: string) =>
  r.resumen.find((s) => s.etiqueta === etiqueta)?.valor;

/** Hand-solved cases of every deliverable (T-12). Each also runs through T-13 and T-14 below. */
const amort = (o: Partial<AmortizacionInput>): AmortizacionInput => ({ ...amortizacion.ejemplo, ...o });
const dep = (o: Partial<DepreciacionInput>): DepreciacionInput => ({
  ...depreciacion.ejemplo,
  unidadesTotales: 0,
  unidadesPorAnio: [],
  ...o,
});
const pe = (o: Partial<PuntoEquilibrioInput>): PuntoEquilibrioInput => ({
  ...puntoEquilibrio.ejemplo,
  ventasEsperadas: 0,
  utilidadObjetivo: 0,
  ...o,
});
const proj = (o: Partial<EvaluacionInput>): EvaluacionInput => ({ ...evaluacionProyecto.ejemplo, ...o });
const kx = (o: Partial<KardexInput>): KardexInput => ({ ...kardex.ejemplo, ...o });
const ratios = (o: Partial<RazonesInput>): RazonesInput => ({ ...razonesFinancieras.ejemplo, ...o });
const worker = (o: Partial<RolPagosInput['trabajadores'][number]>) => ({
  nombre: 'Trabajador',
  cargo: '',
  sueldo: 600,
  horasSuplementarias: 0,
  horasExtraordinarias: 0,
  comisiones: 0,
  mesesAntiguedad: 0,
  decimosMensualizados: false,
  otrosDescuentos: 0,
  ...o,
});

const CASES: Record<string, unknown[]> = {
  amortizacion: [
    amort({}),
    amort({ monto: 12_000, tasaAnual: 12, plazo: 6, sistema: 'aleman' }),
    amort({ monto: 5_000, tasaAnual: 10, plazo: 4, periodicidad: 'trimestral', sistema: 'americano' }),
    amort({ monto: 6_000, tasaAnual: 16, plazo: 18 }),
    amort({ monto: 1_200, tasaAnual: 0, plazo: 12 }),
  ],
  depreciacion: [
    dep({ costo: 25_000, valorResidual: 5_000, vidaUtil: 5, metodo: 'linea-recta' }),
    dep({ costo: 30_000, valorResidual: 3_000, vidaUtil: 4, metodo: 'suma-digitos' }),
    dep({}),
    dep({ costo: 20_000, valorResidual: 2_000, vidaUtil: 5, metodo: 'doble-saldo' }),
    dep({
      costo: 50_000,
      valorResidual: 5_000,
      metodo: 'unidades',
      unidadesTotales: 100_000,
      unidadesPorAnio: [30_000, 25_000, 25_000, 20_000],
    }),
  ],
  'punto-equilibrio': [
    puntoEquilibrio.ejemplo,
    pe({ precio: 15, costoVariable: 9.5, costosFijos: 10_000 }),
    pe({ precio: 50, costoVariable: 30, costosFijos: 10_000, ventasEsperadas: 400 }),
  ],
  'evaluacion-proyecto': [
    evaluacionProyecto.ejemplo,
    proj({ inversion: 8_000, flujos: [3_000, 3_500, 4_000], tasa: 12 }),
    proj({ inversion: 10_000, flujos: [3_000, 3_000, 3_000], tasa: 10 }),
  ],
  'razones-financieras': [
    razonesFinancieras.ejemplo,
    ratios({
      activoCorriente: 80_000,
      inventarioInicial: 0,
      inventarioFinal: 30_000,
      activoTotal: 200_000,
      pasivoCorriente: 100_000,
      pasivoTotal: 150_000,
      patrimonio: 50_000,
      ventas: 300_000,
      costoVentas: 200_000,
      utilidadNeta: -10_000,
      cuentasPorCobrarInicial: 0,
      cuentasPorCobrarFinal: 20_000,
    }),
    ratios({
      activoTotal: 100_000,
      activoCorriente: 50_000,
      inventarioFinal: 10_000,
      pasivoCorriente: 20_000,
      pasivoTotal: 30_000,
      patrimonio: 60_000,
    }),
  ],
  kardex: [
    kardex.ejemplo,
    kx({ metodo: 'peps' }),
    kx({
      inicial: { fecha: '01/04', cantidad: 3, costoUnitario: 10 },
      movimientos: [
        { fecha: '02/04', detalle: 'Compra', tipo: 'compra', cantidad: 3, costoUnitario: 10.01 },
        { fecha: '03/04', detalle: 'Venta', tipo: 'venta', cantidad: 6, costoUnitario: 0 },
      ],
    }),
  ],
  'rol-pagos': [
    rolPagos.ejemplo,
    {
      empresa: 'Taller',
      periodo: 'abril',
      trabajadores: [worker({ nombre: 'Rosa', sueldo: 480, horasExtraordinarias: 4 })],
    },
    {
      empresa: 'Tres trabajadores',
      periodo: 'mayo',
      trabajadores: [
        worker({ nombre: 'A', sueldo: 482 }),
        worker({
          nombre: 'B',
          sueldo: 900,
          horasSuplementarias: 8,
          mesesAntiguedad: 13,
          otrosDescuentos: 50,
        }),
        worker({ nombre: 'C', sueldo: 1_500, comisiones: 320.5, decimosMensualizados: true }),
      ],
    },
  ],
  'libro-diario': [
    libroDiario.ejemplo,
    {
      empresa: 'Mayúsculas',
      asientos: [
        {
          fecha: '01/04',
          concepto: 'Capital',
          lineas: [
            { cuenta: 'Caja', tipo: 'activo', debe: 3_000, haber: 0 },
            { cuenta: 'Capital', tipo: 'patrimonio', debe: 0, haber: 3_000 },
          ],
        },
        {
          fecha: '02/04',
          concepto: 'Compra a crédito',
          lineas: [
            { cuenta: 'Mercaderías', tipo: 'activo', debe: 1_200, haber: 0 },
            { cuenta: 'Proveedores', tipo: 'pasivo', debe: 0, haber: 1_200 },
          ],
        },
        {
          fecha: '03/04',
          concepto: 'Pago al proveedor',
          lineas: [
            { cuenta: 'proveedores', tipo: 'pasivo', debe: 700, haber: 0 },
            { cuenta: 'caja', tipo: 'activo', debe: 0, haber: 700 },
          ],
        },
      ],
    },
    {
      empresa: 'Asiento compuesto',
      asientos: [
        {
          fecha: '05/04',
          concepto: 'Venta con IVA y cobro parcial',
          lineas: [
            { cuenta: 'Caja', tipo: 'activo', debe: 575, haber: 0 },
            { cuenta: 'Clientes', tipo: 'activo', debe: 575, haber: 0 },
            { cuenta: 'Ventas', tipo: 'ingreso', debe: 0, haber: 1_000 },
            { cuenta: 'IVA cobrado', tipo: 'pasivo', debe: 0, haber: 150 },
          ],
        },
      ],
    },
  ],
};

describe('catálogo de entregables', () => {
  it('lists the eight deliverables of the first cycles, each with its calculation', () => {
    expect(DELIVERABLES.map((d) => d.id).sort()).toEqual(Object.keys(DEFINITIONS).sort());
    expect(DELIVERABLES).toHaveLength(8);
    for (const id of Object.keys(DEFINITIONS)) expect(CASES[id]?.length, id).toBeGreaterThanOrEqual(3);
  });
});

describe('T-12: entregables resueltos a mano', () => {
  it('amortization: French, German and American systems', () => {
    const [fr, al, am, fr18, zero] = CASES.amortizacion as AmortizacionInput[];
    const f = amortizationRows(fr!);
    expect(f.cuotaFija).toBe(902.58);
    expect(f.filas[0]).toEqual({ periodo: 1, cuota: 902.58, interes: 125, capital: 777.58, saldo: 9_222.42 });
    expect(f.filas[11]).toMatchObject({ cuota: 902.62, saldo: 0 });
    expect(value(amortizacion.compute(fr!), 'Total de intereses')).toBe(831);
    expect(amortizationRows(al!).filas.map((r) => r.interes)).toEqual([120, 100, 80, 60, 40, 20]);
    expect(amortizationRows(al!).filas.map((r) => r.cuota)).toEqual([
      2_120, 2_100, 2_080, 2_060, 2_040, 2_020,
    ]);
    const a = amortizationRows(am!).filas;
    expect(a.map((r) => r.cuota)).toEqual([125, 125, 125, 5_125]);
    expect(value(amortizacion.compute(am!), 'Total de intereses')).toBe(500);
    const f18 = amortizationRows(fr18!);
    expect(f18.cuotaFija).toBe(377.14);
    expect(f18.filas[17]!.cuota).toBe(377.11);
    expect(value(amortizacion.compute(fr18!), 'Total de intereses')).toBe(788.49);
    expect(amortizationRows(zero!).cuotaFija).toBe(100);
    expect(() => amortizacion.compute(amort({ plazo: 0 }))).toThrow(DeliverableError);
  });

  it('depreciation by the four methods', () => {
    const [sl, syd, ddb, ddb2, units] = CASES.depreciacion as DepreciacionInput[];
    expect(depreciationRows(sl!).map((r) => r.depreciacion)).toEqual([4_000, 4_000, 4_000, 4_000, 4_000]);
    expect(depreciationRows(syd!).map((r) => r.depreciacion)).toEqual([10_800, 8_100, 5_400, 2_700]);
    // OpenStax 11.3: cost 58 000, salvage 10 000, 5 years; it never goes below the salvage value.
    expect(depreciationRows(ddb!).map((r) => r.depreciacion)).toEqual([23_200, 13_920, 8_352, 2_528, 0]);
    expect(depreciationRows(ddb2!).map((r) => r.depreciacion)).toEqual([8_000, 4_800, 2_880, 1_728, 592]);
    expect(depreciationRows(units!).map((r) => r.depreciacion)).toEqual([13_500, 11_250, 11_250, 9_000]);
    for (const c of [sl, syd, ddb, ddb2, units])
      expect(depreciationRows(c!).at(-1)?.valorLibros).toBe(c!.valorResidual);
    expect(() => depreciacion.compute(dep({ valorResidual: 60_000 }))).toThrow(/residual/);
  });

  it('break-even point, target profit, margin of safety and leverage', () => {
    const [a, b, c] = CASES['punto-equilibrio'] as PuntoEquilibrioInput[];
    const r = puntoEquilibrio.compute(a!);
    expect(value(r, 'Punto de equilibrio')).toBe(1_000);
    expect(value(r, 'Ventas de equilibrio')).toBe(20_000);
    expect(value(r, 'Unidades para ganar 4.000')).toBe(1_500);
    expect(value(r, 'Utilidad con las ventas esperadas')).toBe(3_200);
    expect(value(r, 'Margen de seguridad')).toBeCloseTo(400 / 1_400, 10);
    expect(r.pasos.find((p) => p.titulo.startsWith('Grado de apalancamiento'))?.resultado).toBeCloseTo(
      3.5,
      10,
    );
    const r2 = puntoEquilibrio.compute(b!);
    expect(value(r2, 'Punto de equilibrio')).toBe(1_818.18);
    expect(value(r2, 'Unidades enteras a vender')).toBe(1_819);
    expect(value(r2, 'Ventas de equilibrio')).toBe(27_272.73);
    const r3 = puntoEquilibrio.compute(c!);
    expect(value(r3, 'Utilidad con las ventas esperadas')).toBe(-2_000);
    expect(r3.advertencias[0]).toMatch(/no llega al punto de equilibrio/);
    expect(() => puntoEquilibrio.compute(pe({ precio: 10, costoVariable: 10 }))).toThrow(DeliverableError);
  });

  it('NPV, IRR, profitability index and payback', () => {
    const [a, b, c] = CASES['evaluacion-proyecto'] as EvaluacionInput[];
    const r = evaluacionProyecto.compute(a!);
    expect(value(r, 'VAN')).toBe(3_189.91);
    expect(value(r, 'TIR') as number).toBeCloseTo(0.155383, 6);
    expect(value(r, 'Índice de rentabilidad') as number).toBeCloseTo(1.063798, 6);
    expect(value(r, 'Recuperación (años)')).toBe(2.32);
    expect(value(evaluacionProyecto.compute(b!), 'VAN')).toBe(315.87);
    const neg = evaluacionProyecto.compute(c!);
    expect(value(neg, 'VAN')).toBe(-2_539.44);
    expect(value(neg, 'TIR') as number).toBeCloseTo(-0.050885, 6);
    expect(value(neg, 'Recuperación (años)')).toBe('No se recupera');
    expect(neg.interpretacion[0]).toMatch(/negativo/);
  });

  it('financial ratios with their reading', () => {
    const [a, b, c] = CASES['razones-financieras'] as RazonesInput[];
    const r = razonesFinancieras.compute(a!);
    const step = (name: string) => r.pasos.find((p) => p.titulo === name)?.resultado;
    expect(step('Razón corriente')).toBe(1.5);
    expect(step('Prueba ácida')).toBeCloseTo(0.9, 10);
    expect(step('Capital de trabajo')).toBe(50_000);
    expect(step('Razón de endeudamiento')).toBeCloseTo(0.4, 10);
    expect(step('Rentabilidad sobre patrimonio (ROE)')).toBeCloseTo(0.15, 10);
    expect(step('DuPont: margen × rotación × multiplicador')).toBeCloseTo(0.15, 10);
    expect(step('Período promedio de cobro')).toBeCloseTo(32.85, 2);
    expect(step('Rotación de inventarios')).toBeCloseTo(6, 10);
    expect(step('Días de inventario')).toBeCloseTo(66.3636, 3);
    expect(r.interpretacion[0]).toBe(
      'Razón corriente: Por cada dólar de deuda de corto plazo, la empresa tiene 1,5 dólares de activos corrientes.',
    );
    const low = razonesFinancieras.compute(b!);
    expect(low.interpretacion[0]).toMatch(/no alcanzan/);
    expect(low.advertencias.join(' ')).toMatch(/saldo final en lugar del promedio/);
    expect(razonesFinancieras.compute(c!).advertencias[0]).toMatch(/no es igual al pasivo más el patrimonio/);
    expect(() => razonesFinancieras.compute(ratios({ pasivoCorriente: 0 }))).toThrow(/pasivo corriente/);
  });

  it('kardex by weighted average and FIFO', () => {
    const [avg, fifo, empty] = CASES.kardex as KardexInput[];
    const a = runKardex(avg!);
    expect(a.primeraVenta?.total).toBe(1_320);
    expect(a.costoVentas).toBe(2_026.15);
    expect([a.finalCant, a.finalTotal]).toEqual([70, 823.85]);
    const f = runKardex(fifo!);
    expect(f.primeraVenta?.partes).toEqual([
      { cantidad: 100, costo: 10 },
      { cantidad: 20, costo: 12 },
    ]);
    expect(f.costoVentas).toBe(1_960);
    expect(f.finalTotal).toBe(890);
    const e = runKardex(empty!);
    expect([e.costoVentas, e.finalCant, e.finalTotal]).toEqual([60.03, 0, 0]);
    expect(() =>
      runKardex(
        kx({
          movimientos: [{ fecha: '', detalle: 'Venta', tipo: 'venta', cantidad: 500, costoUnitario: 0 }],
        }),
      ),
    ).toThrow(/solo hay 100/);
  });

  it('payroll of several workers with employer provisions', () => {
    const [two, rosa, three] = CASES['rol-pagos'] as RolPagosInput[];
    const [ana, luis] = runPayroll(two!);
    expect(ana).toMatchObject({
      horas: 40.63,
      liquido: 625.37,
      patronal: 77.01,
      provision13: 57.55,
      provision14: 40.17,
      vacaciones: 28.78,
    });
    expect(ana!.r.materiaGravadaIess).toBe(690.63);
    expect(ana!.r.totalDescuentos).toBe(65.26);
    expect(luis).toMatchObject({
      decimos: 131.84,
      fondo: 91.67,
      liquido: 1_219.56,
      patronal: 122.65,
      vacaciones: 45.83,
      provision13: 0,
    });
    expect(luis!.r.totalIngresos).toBe(1_323.51);
    expect(value(rolPagos.compute(two!), 'Total líquido a pagar')).toBe(1_844.93);
    const [r] = runPayroll(rosa!);
    expect(r).toMatchObject({ horas: 16, liquido: 449.13 });
    expect(rolPagos.compute(rosa!).advertencias[0]).toMatch(/menor que el salario básico/);
    expect(runPayroll(three!)).toHaveLength(3);
  });

  it('journal, ledger and trial balance', () => {
    const [ex, mixed, compound] = CASES['libro-diario'] as LibroDiarioInput[];
    const j = runJournal(ex!);
    expect([j.totalDebe, j.totalHaber]).toEqual([7_750, 7_750]);
    expect(j.balance.filas.map((f) => [f.cuenta, f.deudor, f.acreedor])).toEqual([
      ['Caja', 5_950, 0],
      ['Capital', 0, 5_000],
      ['Mercaderías', 1_800, 0],
      ['Proveedores', 0, 1_800],
      ['Ventas', 0, 950],
    ]);
    const m = runJournal(mixed!);
    expect(m.ledger.find((a) => a.cuenta === 'Caja')?.saldo).toBe(2_300);
    expect(m.ledger.find((a) => a.cuenta === 'Proveedores')?.saldo).toBe(500);
    expect(m.balance.totalDeudor).toBe(3_500);
    expect(runJournal(compound!).totalDebe).toBe(1_150);
    expect(() =>
      runJournal({
        empresa: '',
        asientos: [
          { fecha: '', concepto: '', lineas: [{ cuenta: 'Caja', tipo: 'activo', debe: 10, haber: 0 }] },
        ],
      }),
    ).toThrow(/Asiento 1/);
  });
});

/** T-14: each step of every procedure evaluates (with the formula engine) to the number it shows. */
describe('T-14: el procedimiento cuadra', () => {
  for (const [id, cases] of Object.entries(CASES)) {
    it(`${id}: every step recalculates and the main answer comes from a step`, () => {
      const def = DEFINITIONS[id] as DeliverableDefinition<unknown>;
      for (const input of cases) {
        const result = def.compute(def.parse(input));
        expect(result.pasos.length, id).toBeGreaterThan(2);
        for (const step of result.pasos) {
          const v = asNumber(evaluateExcel(step.calculo));
          expect(v instanceof FormulaError, `${id} · ${step.titulo}: ${step.calculo}`).toBe(false);
          const tolerance = step.formato === 'money' ? 0.005 : 1e-6 * Math.max(1, Math.abs(step.resultado));
          expect(
            Math.abs((v as number) - step.resultado),
            `${id} · ${step.titulo}: ${step.calculo}`,
          ).toBeLessThanOrEqual(tolerance);
        }
        for (const s of result.resumen.filter((x) => x.destacado && typeof x.valor === 'number')) {
          expect(
            result.pasos.some((p) => Math.abs(p.resultado - (s.valor as number)) < 0.005),
            `${id}: «${s.etiqueta}» no sale de ningún paso`,
          ).toBe(true);
        }
      }
    });
  }
});

/** T-13: the exported workbook, read back and recalculated, shows the same numbers as the screen. */
describe('T-13: exportación fiel', () => {
  for (const [id, cases] of Object.entries(CASES)) {
    it(`${id}: the .xlsx recalculates to the numbers on screen`, () => {
      const def = DEFINITIONS[id] as DeliverableDefinition<unknown>;
      for (const input of cases) {
        const parsed = def.parse(input);
        const result = def.compute(parsed);
        const sheet = def.toSheet(parsed, result);
        expect(sheet.checks.length, id).toBeGreaterThanOrEqual(3);
        const bytes = exportXlsx(sheet.cells, sheet.formats, 'en', 'Entregable');
        const back = importSpreadsheet(bytes, 'en');
        const computed = computeSheet(back.cells, 'en');
        for (const check of sheet.checks) {
          const cell = computed[check.cell];
          expect(
            back.cells[check.cell]?.startsWith('='),
            `${id} · ${check.etiqueta}: la celda debe tener una fórmula viva`,
          ).toBe(true);
          expect(
            typeof cell?.value,
            `${id} · ${check.etiqueta} (${check.cell}) = ${String(cell?.value)}`,
          ).toBe('number');
          expect(
            Math.abs((cell!.value as number) - check.valor),
            `${id} · ${check.etiqueta} (${check.cell})`,
          ).toBeLessThanOrEqual(0.005);
        }
      }
    });
  }
});

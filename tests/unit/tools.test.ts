import { describe, expect, it, vi } from 'vitest';
import { legacyMateria } from '../../src/data/legacy';
import { rankOptions, normalizedWeights } from '../../src/domain/tools/decision';
import {
  cvp,
  irr,
  npv,
  npvProfile,
  payback,
  profitabilityIndex,
  signChanges,
} from '../../src/domain/tools/finance';
import { checkEntry, postToLedger, statements, trialBalance } from '../../src/domain/tools/journal';
import { equilibrium, priceControl, taxEffect } from '../../src/domain/tools/market';
import { isSafeUrl, parseInline, parseMarkdown, wordCount } from '../../src/domain/tools/markdown';
import {
  COUNTRIES,
  convert,
  fetchIndicator,
  fetchLatestUsd,
  fetchUsdSeries,
  OpenDataError,
  parseWorldBank,
  worldBankUrl,
  INDICATORS,
} from '../../src/domain/tools/opendata';
import { computePayroll, DEFAULT_PAYROLL } from '../../src/domain/tools/payroll';
import { compile, derivative, extrema, normalizeExpression, roots } from '../../src/domain/tools/plot';
import { INITIAL_SM2, nextReview, review } from '../../src/domain/tools/sm2';
import {
  boxPlot,
  describe as describeData,
  histogram,
  meanInterval,
  oneSampleT,
  parseData,
  proportionInterval,
  regression,
  sampleSize,
} from '../../src/domain/tools/stats';
import {
  incomeTaxPersonas,
  incomeTaxSociedades,
  IR_PERSONAS_2026,
  ivaFromBase,
  ivaFromTotal,
  rimpeTax,
} from '../../src/domain/tools/tax';
import type { Asiento } from '../../src/data/types';

describe('tax (SRI tables verified 2026-10-25)', () => {
  it('IVA from a base and from a final price', () => {
    expect(ivaFromBase(200)).toEqual({ base: 200, iva: 30, total: 230 });
    expect(ivaFromTotal(115)).toEqual({ base: 100, iva: 15, total: 115 });
    expect(ivaFromBase(100, 0.05).iva).toBe(5);
    expect(() => ivaFromBase(-1)).toThrow(RangeError);
  });

  it('income tax of individuals with the 2026 table', () => {
    expect(incomeTaxPersonas(12_000).impuesto).toBe(0);
    // 15 549 → 20 188 bracket: 167 + 10 % × (18 000 − 15 549) = 412.10
    expect(incomeTaxPersonas(18_000)).toMatchObject({ impuesto: 412.1, excedente: 2451 });
    // top bracket: 24 572 + 37 % × (200 000 − 109 956)
    expect(incomeTaxPersonas(200_000).impuesto).toBeCloseTo(24_572 + 0.37 * 90_044, 2);
  });

  it('the published table is internally consistent (each basic tax = previous + rate × width)', () => {
    for (let i = 1; i < IR_PERSONAS_2026.length; i += 1) {
      const prev = IR_PERSONAS_2026[i - 1]!;
      const cur = IR_PERSONAS_2026[i]!;
      expect(cur.desde).toBe(prev.hasta);
      expect(
        Math.abs(
          prev.impuestoFraccion + ((prev.hasta ?? 0) - prev.desde) * prev.porcentaje - cur.impuestoFraccion,
        ),
      ).toBeLessThan(1);
    }
  });

  it('companies pay the 25 % general rate', () => {
    expect(incomeTaxSociedades(10_000)).toBe(2500);
  });

  it('RIMPE: popular businesses, entrepreneurs and limits', () => {
    expect(rimpeTax(2000, true)).toEqual({ regimen: 'negocio-popular', impuesto: 0 });
    expect(rimpeTax(12_000, true)).toEqual({ regimen: 'negocio-popular', impuesto: 35 });
    expect(rimpeTax(20_000, true)).toEqual({ regimen: 'negocio-popular', impuesto: 60 });
    expect(rimpeTax(60_000, false)).toMatchObject({ regimen: 'emprendedor', impuesto: 485 });
    expect(rimpeTax(25_000, true)).toMatchObject({ regimen: 'emprendedor', impuesto: 110 });
    expect(rimpeTax(15_000, false)).toEqual({ regimen: 'sin-tramo', impuesto: null });
    expect(rimpeTax(300_001, false)).toEqual({ regimen: 'fuera', impuesto: null });
  });
});

describe('payroll (IESS table and Código del Trabajo)', () => {
  it('a plain salary: 9.45 % personal, 11.15 % employer, provisions of the 13th and 14th salaries', () => {
    const r = computePayroll({ ...DEFAULT_PAYROLL, sueldo: 1000 });
    expect(r.netoAPagar).toBe(905.5);
    expect(r.costosEmpleador.find((l) => l.concepto.startsWith('Aporte patronal'))?.valor).toBe(111.5);
    expect(r.costosEmpleador.find((l) => l.concepto.includes('tercera'))?.valor).toBe(83.33);
    expect(r.costosEmpleador.find((l) => l.concepto.includes('cuarta'))?.valor).toBe(40.17);
    expect(r.ingresos.some((l) => l.concepto.startsWith('Fondo de reserva'))).toBe(false);
  });

  it('overtime surcharges, monthly 13th/14th and the reserve fund after the first year', () => {
    const r = computePayroll({
      ...DEFAULT_PAYROLL,
      sueldo: 960,
      horasSuplementarias: 10,
      horasNocturnas: 2,
      mesesAntiguedad: 12,
      decimosMensualizados: true,
    });
    // hour = 960 / 240 = 4; 10 h × 6 = 60; 2 h × 8 = 16
    expect(r.ingresos.find((l) => l.concepto.startsWith('Horas suplementarias'))?.valor).toBe(60);
    expect(r.ingresos.find((l) => l.concepto.startsWith('Horas entre'))?.valor).toBe(16);
    expect(r.materiaGravadaIess).toBe(1036);
    expect(r.ingresos.find((l) => l.concepto.startsWith('Fondo de reserva'))?.valor).toBe(86.33);
    expect(r.descuentos[0]?.valor).toBe(97.9);
  });

  it('warns below the minimum wage and rejects invalid input', () => {
    expect(computePayroll({ ...DEFAULT_PAYROLL, sueldo: 300 }).advertencias.join(' ')).toMatch(
      /salario básico/,
    );
    expect(() => computePayroll({ ...DEFAULT_PAYROLL, sueldo: -1 })).toThrow(RangeError);
    expect(() => computePayroll({ ...DEFAULT_PAYROLL, horasMes: 0 })).toThrow(RangeError);
  });
});

describe('finance: CVP and capital budgeting', () => {
  it('break-even, margin of safety and operating leverage', () => {
    const r = cvp({ precio: 50, costoVariable: 30, costosFijos: 10_000, ventasUnidades: 700 });
    expect(r.equilibrioUnidades).toBe(500);
    expect(r.equilibrioDolares).toBe(25_000);
    expect(r.utilidad).toBe(4000);
    expect(r.margenSeguridadPct).toBeCloseTo(200 / 700, 10);
    expect(r.apalancamientoOperativo).toBeCloseTo(14_000 / 4000, 10);
    expect(() => cvp({ precio: 10, costoVariable: 10, costosFijos: 1, ventasUnidades: 1 })).toThrow(
      /mayor que el costo variable/,
    );
  });

  it('NPV, IRR, profitability index and payback agree with each other', () => {
    const flows = [-10_000, 3000, 4000, 4000, 3500];
    const tir = irr(flows)!;
    expect(npv(tir, flows)).toBeCloseTo(0, 6);
    expect(npv(0.12, flows)).toBeCloseTo(
      -10_000 + 3000 / 1.12 + 4000 / 1.12 ** 2 + 4000 / 1.12 ** 3 + 3500 / 1.12 ** 4,
      8,
    );
    expect(profitabilityIndex(0.12, flows)! - 1).toBeCloseTo(npv(0.12, flows) / 10_000, 10);
    expect(payback(flows)).toBeCloseTo(2 + 3000 / 4000, 10);
    expect(payback(flows, 0.12)!).toBeGreaterThan(payback(flows)!);
    expect(npvProfile(flows, 0, 0.5, 10)).toHaveLength(11);
  });

  it('no IRR without a sign change; several sign changes are reported', () => {
    expect(irr([100, 200])).toBeNull();
    expect(signChanges([-100, 230, -132])).toBe(2);
    expect(payback([-100, 10, 10])).toBeNull();
  });
});

describe('market model', () => {
  const m = { g: 100, h: 1, e: 10, f: 0.5 };
  it('equilibrium, surpluses and elasticity', () => {
    const eq = equilibrium(m);
    expect(eq.cantidad).toBeCloseTo(60, 10);
    expect(eq.precio).toBeCloseTo(40, 10);
    expect(eq.excedenteConsumidor).toBeCloseTo(1800, 8);
    expect(eq.excedenteProductor).toBeCloseTo(900, 8);
    expect(eq.elasticidadDemanda).toBeCloseTo(-40 / 60, 10);
  });

  it('a tax splits between buyers and sellers and creates a deadweight loss', () => {
    const t = taxEffect(m, 15);
    expect(t.cantidad).toBeCloseTo(50, 10);
    expect(t.precioConsumidor).toBeCloseTo(50, 10);
    expect(t.precioProductor).toBeCloseTo(35, 10);
    expect(t.recaudacion).toBeCloseTo(750, 8);
    expect(t.perdidaEficiencia).toBeCloseTo(75, 8);
  });

  it('price controls only bind on the right side of equilibrium', () => {
    expect(priceControl(m, 30, 'maximo')).toMatchObject({ tipo: 'escasez', faltante: 70 - 40 });
    expect(priceControl(m, 50, 'minimo')).toMatchObject({ tipo: 'excedente', sobrante: 80 - 50 });
    expect(priceControl(m, 50, 'maximo')).toEqual({ tipo: 'sin-efecto' });
    expect(() => equilibrium({ ...m, g: 5 })).toThrow(RangeError);
  });
});

describe('SM-2 spaced repetition', () => {
  it('intervals 1, 6, then × EF; failure restarts without changing EF', () => {
    const a = review(INITIAL_SM2, 5);
    expect(a).toMatchObject({ intervalo: 1, repeticiones: 1, ef: 2.6 });
    const b = review(a, 4);
    expect(b).toMatchObject({ intervalo: 6, repeticiones: 2 });
    const c = review(b, 4);
    expect(c.intervalo).toBe(Math.ceil(6 * b.ef));
    expect(review(c, 1)).toEqual({ ef: c.ef, intervalo: 1, repeticiones: 0 });
  });

  it('EF never drops below 1.3', () => {
    let s = INITIAL_SM2;
    for (let i = 0; i < 20; i += 1) s = review(s, 3);
    expect(s.ef).toBe(1.3);
    expect(nextReview(new Date('2026-10-25T10:00:00Z'), 6)).toBe('2026-10-31T10:00:00.000Z');
  });
});

describe('decision matrix', () => {
  it('normalizes weights and ranks options', () => {
    expect(
      normalizedWeights([
        { nombre: 'a', peso: 30 },
        { nombre: 'b', peso: 10 },
      ]),
    ).toEqual([0.75, 0.25]);
    const ranking = rankOptions({
      criterios: [
        { nombre: 'Costo', peso: 50 },
        { nombre: 'Calidad', peso: 50 },
      ],
      opciones: ['A', 'B'],
      puntajes: [
        [10, 2],
        [6, 8],
      ],
    });
    expect(ranking.map((r) => [r.opcion, r.total, r.posicion])).toEqual([
      ['B', 7, 1],
      ['A', 6, 2],
    ]);
    expect(
      rankOptions({ criterios: [{ nombre: 'x', peso: 1 }], opciones: ['A'], puntajes: [[99]] })[0]?.total,
    ).toBe(10);
  });
});

describe('journal, ledger and trial balance', () => {
  const asientos: Asiento[] = [
    {
      id: '1',
      fecha: '2026-01-02',
      glosa: 'Aporte',
      lineas: [
        { cuenta: 'Caja', tipo: 'activo', debe: 1000, haber: 0 },
        { cuenta: 'Capital', tipo: 'patrimonio', debe: 0, haber: 1000 },
      ],
    },
    {
      id: '2',
      fecha: '2026-01-03',
      glosa: 'Venta',
      lineas: [
        { cuenta: 'caja', tipo: 'activo', debe: 300.1, haber: 0 },
        { cuenta: 'Ventas', tipo: 'ingreso', debe: 0, haber: 300.1 },
      ],
    },
    {
      id: '3',
      fecha: '2026-01-04',
      glosa: 'Arriendo',
      lineas: [
        { cuenta: 'Arriendo', tipo: 'gasto', debe: 200.2, haber: 0 },
        { cuenta: 'Caja', tipo: 'activo', debe: 0, haber: 200.2 },
      ],
    },
  ];

  it('rejects unbalanced or malformed entries', () => {
    expect(
      checkEntry([
        { cuenta: 'Caja', tipo: 'activo', debe: 10, haber: 0 },
        { cuenta: 'Capital', tipo: 'patrimonio', debe: 0, haber: 9 },
      ]).ok,
    ).toBe(false);
    expect(
      checkEntry([
        { cuenta: 'Caja', tipo: 'activo', debe: 10, haber: 10 },
        { cuenta: 'X', tipo: 'activo', debe: 0, haber: 0 },
      ]).errores.length,
    ).toBeGreaterThan(0);
    expect(
      checkEntry([
        { cuenta: 'Caja', tipo: 'activo', debe: 0.1, haber: 0 },
        { cuenta: 'Bancos', tipo: 'activo', debe: 0.2, haber: 0 },
        { cuenta: 'Capital', tipo: 'patrimonio', debe: 0, haber: 0.3 },
      ]).ok,
    ).toBe(true);
  });

  it('posts to T accounts (case-insensitive names), balances and closes the accounting equation', () => {
    const ledger = postToLedger(asientos);
    const caja = ledger.find((a) => a.cuenta === 'Caja');
    expect(caja).toMatchObject({ totalDebe: 1300.1, totalHaber: 200.2, saldo: 1099.9, ladoSaldo: 'debe' });
    const tb = trialBalance(ledger);
    expect(tb.cuadra).toBe(true);
    expect(tb.totalDeudor).toBe(1300.1);
    const st = statements(ledger);
    expect(st.utilidad).toBeCloseTo(99.9, 10);
    expect(st.diferencia).toBe(0);
  });
});

describe('statistics', () => {
  it('parses data written with decimal comma or pasted from a sheet', () => {
    expect(parseData('1,5\n2.5; 3\t1.234,5 abc')).toEqual({
      values: [1.5, 2.5, 3, 1234.5],
      ignored: ['abc'],
    });
  });

  it('describes a sample (n − 1 variance, inclusive quartiles)', () => {
    const d = describeData([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(d.media).toBe(5);
    expect(d.mediana).toBe(4.5);
    expect(d.moda).toEqual([4]);
    expect(d.varianza).toBeCloseTo(32 / 7, 10);
    expect(d.q1).toBe(4);
    expect(d.q3).toBe(5.5);
    expect(() => describeData([1])).toThrow(RangeError);
  });

  it('histogram covers every value and the box plot flags outliers', () => {
    const values = [1, 2, 2, 3, 3, 3, 4, 4, 5, 40];
    expect(histogram(values).reduce((s, b) => s + b.frecuencia, 0)).toBe(values.length);
    expect(boxPlot(values).atipicos).toEqual([40]);
  });

  it('t interval and t test match textbook values', () => {
    const sample = [12, 15, 11, 18, 14, 16, 13, 22, 15, 17, 14, 19];
    const ci = meanInterval(sample, 0.95);
    expect(ci.critico).toBeCloseTo(2.201, 3);
    const t = oneSampleT(sample, 15, 0.05, 'distinta');
    expect(t.gl).toBe(11);
    expect(t.valorP).toBeGreaterThan(0.05);
    expect(oneSampleT(sample, 10, 0.05, 'mayor').rechaza).toBe(true);
  });

  it('proportion interval and sample size (95 %, ±5 %, p = 0.5 → 385)', () => {
    const p = proportionInterval(120, 300, 0.95);
    expect(p.p).toBe(0.4);
    expect(p.margen).toBeCloseTo(1.96 * Math.sqrt((0.4 * 0.6) / 300), 3);
    expect(sampleSize(0.95, 0.05, { p: 0.5 })).toBe(385);
    expect(() => proportionInterval(5, 3, 0.95)).toThrow(RangeError);
  });

  it('least-squares regression', () => {
    const r = regression([1, 2, 3, 4], [3, 5, 7, 9]);
    expect(r.b).toBeCloseTo(2, 12);
    expect(r.a).toBeCloseTo(1, 12);
    expect(r.r).toBeCloseTo(1, 12);
    expect(() => regression([1, 1, 1], [1, 2, 3])).toThrow(RangeError);
  });
});

describe('function plotter (safe parser, no eval)', () => {
  it('accepts notebook notation', () => {
    expect(normalizeExpression('y = 2x^2 - 3x + 1')).toBe('2*x^2 - 3*x + 1');
    expect(normalizeExpression('0,5x')).toBe('0.5*x');
    expect(normalizeExpression('e^(0,05x)')).toBe('EXP(1)^(0.05*x)');
    expect(normalizeExpression('log(x)+raiz(x)')).toBe('LOG10(x)+SQRT(x)');
    expect(normalizeExpression('2(x+1)(x-1)')).toBe('2*(x+1)*(x-1)');
  });

  it('evaluates, differentiates and finds roots and extrema', () => {
    const c = compile('x*(100 - 2x)');
    if (!c.ok) throw new Error(c.message);
    expect(c.f(10)).toBe(800);
    expect(derivative(c.f, 10)).toBeCloseTo(60, 4);
    expect(roots(c.f, -10, 60)).toEqual([0, 50]);
    expect(extrema(c.f, 0, 50)[0]).toMatchObject({ x: 25, tipo: 'maximo' });
    const ln = compile('ln(x)');
    if (!ln.ok) throw new Error(ln.message);
    expect(ln.f(-1)).toBeNull();
  });

  it('rejects code and unknown names instead of running them', () => {
    for (const evil of [
      'alert(1)',
      'constructor.constructor("x")()',
      'window.location',
      'fetch("https://x")',
      'y',
    ]) {
      expect(compile(evil).ok, evil).toBe(false);
    }
    expect(() => normalizeExpression('x+'.repeat(150))).toThrow(RangeError);
  });
});

describe('safe Markdown', () => {
  it('parses headings, lists, tables, code and math blocks', () => {
    const blocks = parseMarkdown(
      '# Título\n\nTexto con **negrita** y $x^2$.\n\n- a\n- b\n\n| A | B |\n|---|---:|\n| 1 | 2 |\n\n$$\nVF = VA(1+i)^n\n$$\n\n```\ncodigo\n```',
    );
    expect(blocks.map((b) => b.type)).toEqual(['heading', 'paragraph', 'list', 'table', 'math', 'code']);
    const table = blocks[3];
    expect(table?.type === 'table' && table.align).toEqual([null, 'right']);
  });

  it('keeps dollar amounts as text and math only between proper delimiters', () => {
    expect(parseInline('Cuesta $5 y $10 en total')).toEqual([
      { type: 'text', text: 'Cuesta $5 y $10 en total' },
    ]);
    expect(parseInline('$a+b$')).toEqual([{ type: 'math', tex: 'a+b' }]);
  });

  it('links only accept http(s); HTML stays text', () => {
    expect(isSafeUrl('https://sri.gob.ec')).toBe(true);
    for (const bad of [
      'javascript:alert(1)',
      'data:text/html,x',
      'vbscript:x',
      ' https://x',
      'https://x"onmouseover=',
    ]) {
      expect(isSafeUrl(bad), bad).toBe(false);
    }
    expect(parseInline('[x](javascript:alert(1))').some((n) => n.type === 'link')).toBe(false);
    expect(parseInline('<script>alert(1)</script>')).toEqual([
      { type: 'text', text: '<script>alert(1)</script>' },
    ]);
  });

  it('counts words without counting formulas', () => {
    expect(wordCount('Hola mundo $x^2 + y^2$ fin')).toBe(3);
  });
});

describe('open data clients (World Bank, Frankfurter/ECB)', () => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const wbAnswer = [
    { page: 1, pages: 1, total: 3, lastupdated: '2026-10-08' },
    [
      { countryiso3code: 'ECU', date: '2024', value: 1.5 },
      { countryiso3code: 'ECU', date: '2023', value: 2.2 },
      { countryiso3code: 'COL', date: '2024', value: null },
    ],
  ];

  it('builds safe URLs only for curated indicators and countries', () => {
    expect(worldBankUrl('FP.CPI.TOTL.ZG', ['ECU', 'XXX'], 2000, 2025)).toBe(
      'https://api.worldbank.org/v2/country/ECU/indicator/FP.CPI.TOTL.ZG?format=json&date=2000:2025&per_page=1000',
    );
    expect(() => worldBankUrl('../../evil', ['ECU'], 2000, 2025)).toThrow(OpenDataError);
    expect(COUNTRIES.some((c) => c.code === 'ECU')).toBe(true);
  });

  it('parses series sorted by year and skips missing values', () => {
    const data = parseWorldBank(wbAnswer, INDICATORS[2]!, ['COL', 'ECU']);
    expect(data.series.find((s) => s.country === 'ECU')?.points).toEqual([
      { year: 2023, value: 2.2 },
      { year: 2024, value: 1.5 },
    ]);
    expect(data.series.find((s) => s.country === 'COL')?.points).toEqual([]);
    expect(() => parseWorldBank({ nada: 1 }, INDICATORS[2]!, ['ECU'])).toThrow();
  });

  it('caches answers, sends no credentials and reports HTTP errors', async () => {
    const store = new Map<string, unknown>();
    const cache = {
      get: async (k: string) => store.get(k),
      set: async (k: string, v: unknown) => void store.set(k, v),
    };
    const fetchFn = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.credentials).toBe('omit');
      return json(wbAnswer);
    }) as unknown as typeof fetch;
    await fetchIndicator('FP.CPI.TOTL.ZG', ['ECU'], 2000, 2025, { fetchFn, cache });
    await fetchIndicator('FP.CPI.TOTL.ZG', ['ECU'], 2000, 2025, { fetchFn, cache });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    await expect(
      fetchIndicator('FP.CPI.TOTL.ZG', ['COL'], 2000, 2025, {
        fetchFn: (async () => json({}, 500)) as unknown as typeof fetch,
      }),
    ).rejects.toThrow(/error \(500\)/);
    await expect(
      fetchIndicator('FP.CPI.TOTL.ZG', ['COL'], 2000, 2025, {
        fetchFn: (async () => json({}, 429)) as unknown as typeof fetch,
      }),
    ).rejects.toThrow(/demasiadas/);
  });

  it('Frankfurter: ECB provider only, validated rates and conversion', async () => {
    const fetchFn = vi.fn(async (url: RequestInfo | URL) => {
      expect(String(url)).toContain('providers=ECB');
      return json([{ date: '2026-10-23', base: 'USD', quote: 'EUR', rate: 0.89342 }]);
    }) as unknown as typeof fetch;
    const rates = await fetchLatestUsd(['EUR', 'COP'], { fetchFn });
    expect(rates).toEqual([{ date: '2026-10-23', quote: 'EUR', rate: 0.89342 }]);
    expect(String((fetchFn as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]?.[0])).not.toContain(
      'COP',
    );
    expect(convert(100, 0.89342)).toBeCloseTo(89.342, 10);
    await expect(fetchUsdSeries('XYZ', '2026-01-01', '2026-02-01', { fetchFn })).rejects.toThrow(
      OpenDataError,
    );
    await expect(fetchUsdSeries('EUR', '2026-02-01', '2026-01-01', { fetchFn })).rejects.toThrow(/fechas/);
    await expect(
      fetchLatestUsd(['EUR'], {
        fetchFn: (async () =>
          json([{ date: 'x', base: 'USD', quote: 'EUR', rate: -1 }])) as unknown as typeof fetch,
      }),
    ).rejects.toThrow();
  });
});

describe('legacy curriculum ids map to the catalog', () => {
  it('maps known subjects and leaves unknown ones undefined', () => {
    expect(legacyMateria('ucuenca-contabilidad-auditoria--c1-contabilidad-general')).toBe(
      'contabilidad-general',
    );
    expect(legacyMateria('ucacue-economia--c2-microeconomia-i')).toBe('microeconomia');
    expect(legacyMateria('x--c3-matematicas-financieras')).toBe('matematica-financiera');
    expect(legacyMateria('x--c5-legislacion-mercantil-y-societaria')).toBe('derecho-empresarial');
    expect(legacyMateria('x--c1-practicas-preprofesionales')).toBeUndefined();
    expect(legacyMateria('tributacion')).toBe('tributacion');
  });
});

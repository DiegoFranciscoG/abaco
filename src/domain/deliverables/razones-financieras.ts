import { z } from '../zod';
import { SheetBuilder } from './sheet-builder';
import {
  DeliverableError,
  es,
  round2,
  xl,
  type DeliverableDefinition,
  type DeliverableResult,
  type SheetExport,
  type Step,
} from './types';

/**
 * Financial ratios with a plain-language reading of each one. Definitions are those of the verified formulas
 * (OpenStax, Principles of Finance 2e, ch. 6; Principles of Accounting vol. 1, 9.3 and 10.5): 365-day year and
 * average balances for the turnovers. The reading explains what the number means; it does not grade it against
 * benchmarks, which depend on the industry.
 */
const money = z.number();
const inputSchema = z.object({
  empresa: z.string().max(120).default('Empresa'),
  activoCorriente: money,
  inventarioInicial: money.default(0),
  inventarioFinal: money,
  activoTotal: money,
  pasivoCorriente: money,
  pasivoTotal: money,
  patrimonio: money,
  ventas: money,
  costoVentas: money,
  utilidadNeta: money,
  cuentasPorCobrarInicial: money.default(0),
  cuentasPorCobrarFinal: money,
});
export type RazonesInput = z.infer<typeof inputSchema>;

interface Ratio {
  id: string;
  nombre: string;
  valor: number;
  formato: 'number' | 'percent' | 'money';
  formula: string;
  expresion: string;
  calculo: string;
  lectura: string;
}

function ratios(input: RazonesInput): { lista: Ratio[]; advertencias: string[] } {
  const e: string[] = [];
  const f = input;
  const nonNegative: [number, string][] = [
    [f.activoCorriente, 'el activo corriente'],
    [f.inventarioFinal, 'el inventario final'],
    [f.inventarioInicial, 'el inventario inicial'],
    [f.activoTotal, 'el activo total'],
    [f.pasivoCorriente, 'el pasivo corriente'],
    [f.pasivoTotal, 'el pasivo total'],
    [f.ventas, 'las ventas'],
    [f.costoVentas, 'el costo de ventas'],
    [f.cuentasPorCobrarFinal, 'las cuentas por cobrar'],
    [f.cuentasPorCobrarInicial, 'las cuentas por cobrar iniciales'],
  ];
  for (const [v, label] of nonNegative) if (!(v >= 0)) e.push(`Revisa ${label}: no puede ser negativo.`);
  if (!(f.activoTotal > 0)) e.push('El activo total tiene que ser mayor que cero.');
  if (!(f.pasivoCorriente > 0))
    e.push('El pasivo corriente tiene que ser mayor que cero para calcular la liquidez.');
  if (!(f.patrimonio > 0))
    e.push('El patrimonio tiene que ser mayor que cero para calcular el ROE y el endeudamiento.');
  if (!(f.ventas > 0)) e.push('Las ventas tienen que ser mayores que cero.');
  if (f.activoCorriente > f.activoTotal)
    e.push('El activo corriente no puede ser mayor que el activo total.');
  if (f.inventarioFinal > f.activoCorriente)
    e.push('El inventario no puede ser mayor que el activo corriente.');
  if (f.pasivoCorriente > f.pasivoTotal)
    e.push('El pasivo corriente no puede ser mayor que el pasivo total.');
  if (!Number.isFinite(f.utilidadNeta)) e.push('Revisa la utilidad neta.');
  if (e.length > 0) throw new DeliverableError(e);

  const advertencias: string[] = [];
  if (Math.abs(f.activoTotal - (f.pasivoTotal + f.patrimonio)) > 0.01) {
    advertencias.push(
      `El activo total (${es(f.activoTotal)}) no es igual al pasivo más el patrimonio (${es(f.pasivoTotal + f.patrimonio)}): revisa los datos del balance.`,
    );
  }
  const cxcProm =
    f.cuentasPorCobrarInicial > 0
      ? (f.cuentasPorCobrarInicial + f.cuentasPorCobrarFinal) / 2
      : f.cuentasPorCobrarFinal;
  const invProm = f.inventarioInicial > 0 ? (f.inventarioInicial + f.inventarioFinal) / 2 : f.inventarioFinal;
  if (f.cuentasPorCobrarInicial === 0 || f.inventarioInicial === 0) {
    advertencias.push(
      'Sin saldos iniciales, las rotaciones usan el saldo final en lugar del promedio del año.',
    );
  }
  const L: Ratio[] = [];
  const add = (r: Ratio) => L.push(r);
  const rc = f.activoCorriente / f.pasivoCorriente;
  add({
    id: 'razon-corriente',
    nombre: 'Razón corriente',
    valor: rc,
    formato: 'number',
    formula: 'Activo corriente ÷ pasivo corriente',
    expresion: `${es(f.activoCorriente)} ÷ ${es(f.pasivoCorriente)} = ${es(rc, 4)}`,
    calculo: `=${xl(f.activoCorriente)}/${xl(f.pasivoCorriente)}`,
    lectura:
      `Por cada dólar de deuda de corto plazo, la empresa tiene ${es(rc)} dólares de activos corrientes.` +
      (rc < 1 ? ' Los activos corrientes no alcanzan para cubrir esas deudas.' : ''),
  });
  const pa = (f.activoCorriente - f.inventarioFinal) / f.pasivoCorriente;
  add({
    id: 'prueba-acida',
    nombre: 'Prueba ácida',
    valor: pa,
    formato: 'number',
    formula: '(Activo corriente − inventarios) ÷ pasivo corriente',
    expresion: `(${es(f.activoCorriente)} − ${es(f.inventarioFinal)}) ÷ ${es(f.pasivoCorriente)} = ${es(pa, 4)}`,
    calculo: `=(${xl(f.activoCorriente)}-${xl(f.inventarioFinal)})/${xl(f.pasivoCorriente)}`,
    lectura: `Sin contar los inventarios, tiene ${es(pa)} dólares por cada dólar de deuda de corto plazo.`,
  });
  const ct = round2(f.activoCorriente - f.pasivoCorriente);
  add({
    id: 'capital-trabajo',
    nombre: 'Capital de trabajo',
    valor: ct,
    formato: 'money',
    formula: 'Activo corriente − pasivo corriente',
    expresion: `${es(f.activoCorriente)} − ${es(f.pasivoCorriente)} = ${es(ct)}`,
    calculo: `=${xl(f.activoCorriente)}-${xl(f.pasivoCorriente)}`,
    lectura:
      ct >= 0
        ? `Después de pagar las deudas de corto plazo quedarían ${es(ct)} dólares de activos corrientes.`
        : `Faltarían ${es(-ct)} dólares de activos corrientes para pagar las deudas de corto plazo.`,
  });
  const end = f.pasivoTotal / f.activoTotal;
  add({
    id: 'endeudamiento',
    nombre: 'Razón de endeudamiento',
    valor: end,
    formato: 'percent',
    formula: 'Pasivo total ÷ activo total',
    expresion: `${es(f.pasivoTotal)} ÷ ${es(f.activoTotal)} = ${es(end * 100, 2)} %`,
    calculo: `=${xl(f.pasivoTotal)}/${xl(f.activoTotal)}`,
    lectura: `El ${es(end * 100, 2)} % de los activos se financia con deuda y el resto con recursos de los dueños.`,
  });
  const dp = f.pasivoTotal / f.patrimonio;
  add({
    id: 'deuda-patrimonio',
    nombre: 'Deuda a patrimonio',
    valor: dp,
    formato: 'number',
    formula: 'Pasivo total ÷ patrimonio',
    expresion: `${es(f.pasivoTotal)} ÷ ${es(f.patrimonio)} = ${es(dp, 4)}`,
    calculo: `=${xl(f.pasivoTotal)}/${xl(f.patrimonio)}`,
    lectura: `Por cada dólar de los dueños, la empresa debe ${es(dp)} dólares a terceros.`,
  });
  const mn = f.utilidadNeta / f.ventas;
  add({
    id: 'margen-neto',
    nombre: 'Margen neto',
    valor: mn,
    formato: 'percent',
    formula: 'Utilidad neta ÷ ventas',
    expresion: `${es(f.utilidadNeta)} ÷ ${es(f.ventas)} = ${es(mn * 100, 2)} %`,
    calculo: `=${xl(f.utilidadNeta)}/${xl(f.ventas)}`,
    lectura:
      mn >= 0
        ? `De cada dólar vendido quedan ${es(mn * 100, 2)} centavos de utilidad neta.`
        : `De cada dólar vendido se pierden ${es(-mn * 100, 2)} centavos.`,
  });
  const ra = f.ventas / f.activoTotal;
  add({
    id: 'rotacion-activos',
    nombre: 'Rotación de activos',
    valor: ra,
    formato: 'number',
    formula: 'Ventas ÷ activo total',
    expresion: `${es(f.ventas)} ÷ ${es(f.activoTotal)} = ${es(ra, 4)}`,
    calculo: `=${xl(f.ventas)}/${xl(f.activoTotal)}`,
    lectura: `Cada dólar invertido en activos generó ${es(ra)} dólares de ventas.`,
  });
  const roa = f.utilidadNeta / f.activoTotal;
  add({
    id: 'roa',
    nombre: 'Rentabilidad sobre activos (ROA)',
    valor: roa,
    formato: 'percent',
    formula: 'Utilidad neta ÷ activo total',
    expresion: `${es(f.utilidadNeta)} ÷ ${es(f.activoTotal)} = ${es(roa * 100, 2)} %`,
    calculo: `=${xl(f.utilidadNeta)}/${xl(f.activoTotal)}`,
    lectura: `Cada dólar invertido en activos generó ${es(roa * 100, 2)} centavos de utilidad neta.`,
  });
  const roe = f.utilidadNeta / f.patrimonio;
  add({
    id: 'roe',
    nombre: 'Rentabilidad sobre patrimonio (ROE)',
    valor: roe,
    formato: 'percent',
    formula: 'Utilidad neta ÷ patrimonio',
    expresion: `${es(f.utilidadNeta)} ÷ ${es(f.patrimonio)} = ${es(roe * 100, 2)} %`,
    calculo: `=${xl(f.utilidadNeta)}/${xl(f.patrimonio)}`,
    lectura: `Cada dólar de los dueños generó ${es(roe * 100, 2)} centavos de utilidad neta.`,
  });
  const mult = f.activoTotal / f.patrimonio;
  add({
    id: 'dupont',
    nombre: 'DuPont: margen × rotación × multiplicador',
    valor: mn * ra * mult,
    formato: 'percent',
    formula: '(Utilidad ÷ ventas) × (ventas ÷ activo) × (activo ÷ patrimonio)',
    expresion: `${es(mn, 6)} × ${es(ra, 6)} × ${es(mult, 6)} = ${es(mn * ra * mult * 100, 2)} %`,
    calculo: `=(${xl(f.utilidadNeta)}/${xl(f.ventas)})*(${xl(f.ventas)}/${xl(f.activoTotal)})*(${xl(f.activoTotal)}/${xl(f.patrimonio)})`,
    lectura: `El ROE se explica por el margen (${es(mn * 100, 2)} %), la rotación de activos (${es(ra)}) y el apalancamiento (${es(mult)} veces el patrimonio).`,
  });
  if (cxcProm > 0) {
    const rcc = f.ventas / cxcProm;
    add({
      id: 'rotacion-cuentas-cobrar',
      nombre: 'Rotación de cuentas por cobrar',
      valor: rcc,
      formato: 'number',
      formula: 'Ventas ÷ cuentas por cobrar promedio',
      expresion: `${es(f.ventas)} ÷ ${es(cxcProm)} = ${es(rcc, 4)} veces`,
      calculo: `=${xl(f.ventas)}/${xl(cxcProm)}`,
      lectura: `Las cuentas por cobrar se cobraron y renovaron ${es(rcc)} veces en el año.`,
    });
    const dc = 365 / rcc;
    add({
      id: 'periodo-cobro',
      nombre: 'Período promedio de cobro',
      valor: dc,
      formato: 'number',
      formula: '365 ÷ rotación de cuentas por cobrar',
      expresion: `365 ÷ ${es(rcc, 4)} = ${es(dc, 2)} días`,
      calculo: `=365/(${xl(f.ventas)}/${xl(cxcProm)})`,
      lectura: `Los clientes tardan en promedio ${es(dc, 1)} días en pagar.`,
    });
  }
  if (invProm > 0 && f.costoVentas > 0) {
    const ri = f.costoVentas / invProm;
    add({
      id: 'rotacion-inventarios',
      nombre: 'Rotación de inventarios',
      valor: ri,
      formato: 'number',
      formula: 'Costo de ventas ÷ inventario promedio',
      expresion: `${es(f.costoVentas)} ÷ ${es(invProm)} = ${es(ri, 4)} veces`,
      calculo: `=${xl(f.costoVentas)}/${xl(invProm)}`,
      lectura: `El inventario se vendió y repuso ${es(ri)} veces en el año.`,
    });
    const di = (365 * f.inventarioFinal) / f.costoVentas;
    add({
      id: 'dias-inventario',
      nombre: 'Días de inventario',
      valor: di,
      formato: 'number',
      formula: '365 × inventario final ÷ costo de ventas',
      expresion: `365 × ${es(f.inventarioFinal)} ÷ ${es(f.costoVentas)} = ${es(di, 2)} días`,
      calculo: `=365*${xl(f.inventarioFinal)}/${xl(f.costoVentas)}`,
      lectura: `Con el ritmo de ventas del año, el inventario final alcanza para ${es(di, 1)} días.`,
    });
  }
  return { lista: L, advertencias };
}

function compute(input: RazonesInput): DeliverableResult {
  const { lista, advertencias } = ratios(input);
  const pasos: Step[] = lista.map((r) => ({
    titulo: r.nombre,
    expresion: `${r.formula}: ${r.expresion}`,
    calculo: r.calculo,
    resultado: r.valor,
    formato: r.formato,
  }));
  const get = (id: string) => lista.find((r) => r.id === id)!;
  return {
    resumen: [
      {
        etiqueta: 'Razón corriente',
        valor: get('razon-corriente').valor,
        formato: 'number',
        destacado: true,
      },
      { etiqueta: 'Endeudamiento', valor: get('endeudamiento').valor, formato: 'percent' },
      { etiqueta: 'Margen neto', valor: get('margen-neto').valor, formato: 'percent' },
      { etiqueta: 'ROE', valor: get('roe').valor, formato: 'percent' },
    ],
    pasos,
    tablas: [
      {
        id: 'razones',
        titulo: `Razones financieras de ${input.empresa || 'la empresa'}`,
        columnas: [
          { titulo: 'Razón', formato: 'text' },
          { titulo: 'Fórmula', formato: 'text' },
          { titulo: 'Resultado', formato: 'text' },
        ],
        filas: lista.map((r) => [
          r.nombre,
          r.formula,
          r.formato === 'percent'
            ? `${es(r.valor * 100, 2)} %`
            : r.formato === 'money'
              ? es(r.valor)
              : es(r.valor, 4),
        ]),
      },
    ],
    advertencias,
    interpretacion: lista.map((r) => `${r.nombre}: ${r.lectura}`),
  };
}

function toSheet(input: RazonesInput): SheetExport {
  const { lista } = ratios(input);
  const f = input;
  const data: [string, number][] = [
    ['Activo corriente', f.activoCorriente],
    ['Inventario inicial', f.inventarioInicial],
    ['Inventario final', f.inventarioFinal],
    ['Activo total', f.activoTotal],
    ['Pasivo corriente', f.pasivoCorriente],
    ['Pasivo total', f.pasivoTotal],
    ['Patrimonio', f.patrimonio],
    ['Ventas', f.ventas],
    ['Costo de ventas', f.costoVentas],
    ['Utilidad neta', f.utilidadNeta],
    ['Cuentas por cobrar iniciales', f.cuentasPorCobrarInicial],
    ['Cuentas por cobrar finales', f.cuentasPorCobrarFinal],
  ];
  const sb = new SheetBuilder().text('A1', f.empresa || 'Empresa');
  data.forEach(([label, v], i) => sb.set(`A${i + 2}`, label).set(`B${i + 2}`, v, 'moneda'));
  // B2 AC · B3 Inv ini · B4 Inv fin · B5 AT · B6 PC · B7 PT · B8 Pat · B9 Ventas · B10 CV · B11 UN · B12 CxC ini · B13 CxC fin
  const cxc = 'IF(B12>0,(B12+B13)/2,B13)';
  const inv = 'IF(B3>0,(B3+B4)/2,B4)';
  const formulas: Record<string, string> = {
    'razon-corriente': '=B2/B6',
    'prueba-acida': '=(B2-B4)/B6',
    'capital-trabajo': '=B2-B6',
    endeudamiento: '=B7/B5',
    'deuda-patrimonio': '=B7/B8',
    'margen-neto': '=B11/B9',
    'rotacion-activos': '=B9/B5',
    roa: '=B11/B5',
    roe: '=B11/B8',
    dupont: '=(B11/B9)*(B9/B5)*(B5/B8)',
    'rotacion-cuentas-cobrar': `=B9/${cxc}`,
    'periodo-cobro': `=365/(B9/${cxc})`,
    'rotacion-inventarios': `=B10/${inv}`,
    'dias-inventario': '=365*B4/B10',
  };
  const start = 16;
  sb.set(`A${start - 1}`, 'Razón').set(`B${start - 1}`, 'Resultado');
  lista.forEach((r, i) => {
    sb.set(`A${start + i}`, r.nombre).check(
      `B${start + i}`,
      formulas[r.id] ?? '',
      r.valor,
      r.nombre,
      r.formato === 'percent' ? 'porcentaje' : r.formato === 'money' ? 'moneda' : 'numero',
    );
  });
  return sb.build();
}

export const razonesFinancieras: DeliverableDefinition<RazonesInput> = {
  id: 'razones-financieras',
  parse: (raw) => inputSchema.parse(raw),
  ejemplo: {
    empresa: 'Comercial Andina S.A.',
    activoCorriente: 150_000,
    inventarioInicial: 50_000,
    inventarioFinal: 60_000,
    activoTotal: 400_000,
    pasivoCorriente: 100_000,
    pasivoTotal: 160_000,
    patrimonio: 240_000,
    ventas: 500_000,
    costoVentas: 330_000,
    utilidadNeta: 36_000,
    cuentasPorCobrarInicial: 40_000,
    cuentasPorCobrarFinal: 50_000,
  },
  compute,
  toSheet,
  fuentes: ['os-pfin2', 'os-pfa'],
  cifras: [],
};

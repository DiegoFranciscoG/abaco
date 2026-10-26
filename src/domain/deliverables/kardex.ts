import { z } from '../zod';
import { SheetBuilder } from './sheet-builder';
import {
  DeliverableError,
  es,
  round2,
  round4,
  xl,
  type DeliverableDefinition,
  type DeliverableResult,
  type SheetExport,
  type Step,
} from './types';

/**
 * Inventory card ("kardex") under the perpetual system, by weighted average or FIFO (PEPS). Totals are rounded to
 * the cent; the average unit cost keeps its decimals, and when a sale empties the stock it takes the remaining
 * balance exactly. Source: OpenStax, Principles of Accounting vol. 1, 10.2 and 10.3 (same as the verified formulas
 * costo-promedio-ponderado, costo-ventas-peps and inventario-final).
 */
export type MetodoKardex = 'promedio' | 'peps';
export const MAX_MOVIMIENTOS = 120;

const inputSchema = z.object({
  producto: z.string().max(120).default('Producto'),
  metodo: z.enum(['promedio', 'peps']),
  inicial: z.object({
    fecha: z.string().max(20).default(''),
    cantidad: z.number(),
    costoUnitario: z.number(),
  }),
  movimientos: z
    .array(
      z.object({
        fecha: z.string().max(20).default(''),
        detalle: z.string().max(80).default(''),
        tipo: z.enum(['compra', 'venta']),
        cantidad: z.number(),
        costoUnitario: z.number().default(0),
      }),
    )
    .max(MAX_MOVIMIENTOS),
});
export type KardexInput = z.infer<typeof inputSchema>;

interface Capa {
  cantidad: number;
  costo: number;
}

export interface KardexRow {
  fecha: string;
  detalle: string;
  entradaCant: number | null;
  entradaCU: number | null;
  entradaTotal: number | null;
  salidaCant: number | null;
  salidaCU: number | null;
  salidaTotal: number | null;
  saldoCant: number;
  saldoTotal: number;
  /** Average cost of the balance, or the FIFO layers left ("80 × 12,00; 50 × 13,00"). */
  saldoDetalle: string;
}

export interface KardexRun {
  filas: KardexRow[];
  costoVentas: number;
  compras: number;
  inicialTotal: number;
  finalCant: number;
  finalTotal: number;
  /** First sale, explained step by step. */
  primeraVenta: {
    cantidad: number;
    partes: Capa[];
    total: number;
    promedio?: { total: number; cant: number };
  } | null;
}

function validate(input: KardexInput): void {
  const e: string[] = [];
  if (!(input.inicial.cantidad >= 0) || !Number.isInteger(input.inicial.cantidad)) {
    e.push('La cantidad inicial tiene que ser un número entero mayor o igual a cero.');
  }
  if (!(input.inicial.costoUnitario >= 0)) e.push('El costo unitario inicial no puede ser negativo.');
  input.movimientos.forEach((m, i) => {
    const n = i + 1;
    if (!(m.cantidad > 0) || !Number.isInteger(m.cantidad))
      e.push(`Movimiento ${n}: la cantidad tiene que ser un entero mayor que cero.`);
    if (m.tipo === 'compra' && !(m.costoUnitario >= 0))
      e.push(`Movimiento ${n}: escribe el costo unitario de la compra.`);
  });
  if (input.movimientos.length === 0) e.push('Agrega al menos una compra o una venta.');
  if (e.length > 0) throw new DeliverableError(e);
}

const layersText = (capas: Capa[]) =>
  capas.length === 0 ? '—' : capas.map((c) => `${es(c.cantidad, 0)} × ${es(c.costo, 4)}`).join('; ');

export function runKardex(input: KardexInput): KardexRun {
  validate(input);
  const filas: KardexRow[] = [];
  const inicialTotal = round2(input.inicial.cantidad * input.inicial.costoUnitario);
  let cant = input.inicial.cantidad;
  let total = inicialTotal;
  let capas: Capa[] = cant > 0 ? [{ cantidad: cant, costo: input.inicial.costoUnitario }] : [];
  let costoVentas = 0;
  let compras = 0;
  let primeraVenta: KardexRun['primeraVenta'] = null;
  const saldoDetalle = () =>
    input.metodo === 'promedio' ? (cant > 0 ? `CU ${es(total / cant, 4)}` : '—') : layersText(capas);
  filas.push({
    fecha: input.inicial.fecha,
    detalle: 'Inventario inicial',
    entradaCant: null,
    entradaCU: null,
    entradaTotal: null,
    salidaCant: null,
    salidaCU: null,
    salidaTotal: null,
    saldoCant: cant,
    saldoTotal: total,
    saldoDetalle: saldoDetalle(),
  });
  input.movimientos.forEach((m, idx) => {
    const detalle = m.detalle || (m.tipo === 'compra' ? 'Compra' : 'Venta');
    if (m.tipo === 'compra') {
      const valor = round2(m.cantidad * m.costoUnitario);
      compras = round2(compras + valor);
      cant += m.cantidad;
      total = round2(total + valor);
      capas.push({ cantidad: m.cantidad, costo: m.costoUnitario });
      filas.push({
        fecha: m.fecha,
        detalle,
        entradaCant: m.cantidad,
        entradaCU: m.costoUnitario,
        entradaTotal: valor,
        salidaCant: null,
        salidaCU: null,
        salidaTotal: null,
        saldoCant: cant,
        saldoTotal: total,
        saldoDetalle: saldoDetalle(),
      });
      return;
    }
    if (m.cantidad > cant) {
      throw new DeliverableError([
        `Movimiento ${idx + 1} (${detalle}): se venden ${es(m.cantidad, 0)} unidades pero solo hay ${es(cant, 0)} en inventario.`,
      ]);
    }
    if (input.metodo === 'promedio') {
      const cu = total / cant;
      const salida = m.cantidad === cant ? total : round2(m.cantidad * cu);
      if (!primeraVenta)
        primeraVenta = {
          cantidad: m.cantidad,
          partes: [{ cantidad: m.cantidad, costo: cu }],
          total: salida,
          promedio: { total, cant },
        };
      cant -= m.cantidad;
      total = round2(total - salida);
      costoVentas = round2(costoVentas + salida);
      capas = cant > 0 ? [{ cantidad: cant, costo: total / cant }] : [];
      filas.push({
        fecha: m.fecha,
        detalle,
        entradaCant: null,
        entradaCU: null,
        entradaTotal: null,
        salidaCant: m.cantidad,
        salidaCU: round4(cu),
        salidaTotal: salida,
        saldoCant: cant,
        saldoTotal: total,
        saldoDetalle: saldoDetalle(),
      });
      return;
    }
    // FIFO: the oldest layers leave first; each layer used is its own line, as on a paper kardex.
    let pending = m.cantidad;
    const partes: Capa[] = [];
    while (pending > 0) {
      const capa = capas[0]!;
      const take = Math.min(pending, capa.cantidad);
      partes.push({ cantidad: take, costo: capa.costo });
      capa.cantidad -= take;
      pending -= take;
      if (capa.cantidad === 0) capas.shift();
    }
    let ventaTotal = 0;
    partes.forEach((p, i) => {
      const lastOfAll = cant - p.cantidad === 0 && i === partes.length - 1;
      const valor = lastOfAll ? total : round2(p.cantidad * p.costo);
      cant -= p.cantidad;
      total = round2(total - valor);
      ventaTotal = round2(ventaTotal + valor);
      filas.push({
        fecha: m.fecha,
        detalle: partes.length > 1 ? `${detalle} (${i + 1} de ${partes.length})` : detalle,
        entradaCant: null,
        entradaCU: null,
        entradaTotal: null,
        salidaCant: p.cantidad,
        salidaCU: p.costo,
        salidaTotal: valor,
        saldoCant: cant,
        saldoTotal: total,
        saldoDetalle: saldoDetalle(),
      });
    });
    costoVentas = round2(costoVentas + ventaTotal);
    if (!primeraVenta) primeraVenta = { cantidad: m.cantidad, partes, total: ventaTotal };
  });
  return { filas, costoVentas, compras, inicialTotal, finalCant: cant, finalTotal: total, primeraVenta };
}

function compute(input: KardexInput): DeliverableResult {
  const k = runKardex(input);
  const pasos: Step[] = [
    {
      titulo: 'Inventario inicial',
      expresion: `${es(input.inicial.cantidad, 0)} × ${es(input.inicial.costoUnitario, 4)} = ${es(k.inicialTotal)}`,
      calculo: `=ROUND(${xl(input.inicial.cantidad)}*${xl(input.inicial.costoUnitario)},2)`,
      resultado: k.inicialTotal,
      formato: 'money',
    },
  ];
  const firstBuy = input.movimientos.find((m) => m.tipo === 'compra');
  if (firstBuy) {
    const v = round2(firstBuy.cantidad * firstBuy.costoUnitario);
    pasos.push({
      titulo: 'Primera compra',
      expresion: `${es(firstBuy.cantidad, 0)} × ${es(firstBuy.costoUnitario, 4)} = ${es(v)}`,
      calculo: `=ROUND(${xl(firstBuy.cantidad)}*${xl(firstBuy.costoUnitario)},2)`,
      resultado: v,
      formato: 'money',
    });
  }
  const pv = k.primeraVenta;
  if (pv?.promedio) {
    const cu = pv.promedio.total / pv.promedio.cant;
    pasos.push(
      {
        titulo: 'Costo promedio antes de la primera venta',
        expresion: `Saldo ÷ cantidad = ${es(pv.promedio.total)} ÷ ${es(pv.promedio.cant, 0)} = ${es(cu, 4)}`,
        calculo: `=${xl(pv.promedio.total)}/${xl(pv.promedio.cant)}`,
        resultado: cu,
        formato: 'number',
      },
      {
        titulo: 'Costo de la primera venta',
        expresion: `${es(pv.cantidad, 0)} × ${es(cu, 4)} = ${es(pv.total)}`,
        calculo:
          pv.cantidad === pv.promedio.cant
            ? `=${xl(pv.promedio.total)}`
            : `=ROUND(${xl(pv.cantidad)}*${xl(pv.promedio.total)}/${xl(pv.promedio.cant)},2)`,
        resultado: pv.total,
        formato: 'money',
      },
    );
  } else if (pv) {
    pasos.push({
      titulo: 'Costo de la primera venta (salen primero las unidades más antiguas)',
      expresion: `${pv.partes.map((p) => `${es(p.cantidad, 0)} × ${es(p.costo, 4)}`).join(' + ')} = ${es(pv.total)}`,
      calculo: `=${pv.partes.map((p) => `ROUND(${xl(p.cantidad)}*${xl(p.costo)},2)`).join('+')}`,
      resultado: pv.total,
      formato: 'money',
    });
  }
  pasos.push(
    {
      titulo: 'Costo de ventas del período',
      expresion: `Suma de las salidas = ${es(k.costoVentas)}`,
      calculo: `=${
        k.filas
          .filter((f) => f.salidaTotal !== null)
          .map((f) => xl(f.salidaTotal!))
          .join('+') || '0'
      }`,
      resultado: k.costoVentas,
      formato: 'money',
    },
    {
      titulo: 'Inventario final',
      expresion: `Inicial + compras − costo de ventas = ${es(k.inicialTotal)} + ${es(k.compras)} − ${es(k.costoVentas)} = ${es(k.finalTotal)}`,
      calculo: `=${xl(k.inicialTotal)}+${xl(k.compras)}-${xl(k.costoVentas)}`,
      resultado: k.finalTotal,
      formato: 'money',
    },
  );
  return {
    resumen: [
      { etiqueta: 'Costo de ventas', valor: k.costoVentas, formato: 'money', destacado: true },
      { etiqueta: 'Inventario final', valor: k.finalTotal, formato: 'money' },
      { etiqueta: 'Unidades en inventario', valor: k.finalCant, formato: 'integer' },
      { etiqueta: 'Compras del período', valor: k.compras, formato: 'money' },
    ],
    pasos,
    tablas: [
      {
        id: 'kardex',
        titulo: `Kardex de ${input.producto || 'producto'} (${input.metodo === 'promedio' ? 'promedio ponderado' : 'PEPS'})`,
        columnas: [
          { titulo: 'Fecha', formato: 'text' },
          { titulo: 'Detalle', formato: 'text' },
          { titulo: 'Entrada cant.', formato: 'integer' },
          { titulo: 'Entrada C.U.', formato: 'number' },
          { titulo: 'Entrada total', formato: 'money' },
          { titulo: 'Salida cant.', formato: 'integer' },
          { titulo: 'Salida C.U.', formato: 'number' },
          { titulo: 'Salida total', formato: 'money' },
          { titulo: 'Saldo cant.', formato: 'integer' },
          { titulo: 'Saldo total', formato: 'money' },
          { titulo: input.metodo === 'promedio' ? 'C.U. del saldo' : 'Capas del saldo', formato: 'text' },
        ],
        filas: k.filas.map((f) => [
          f.fecha,
          f.detalle,
          f.entradaCant,
          f.entradaCU,
          f.entradaTotal,
          f.salidaCant,
          f.salidaCU,
          f.salidaTotal,
          f.saldoCant,
          f.saldoTotal,
          f.saldoDetalle,
        ]),
        total: [
          '',
          'Totales',
          null,
          null,
          k.compras,
          null,
          null,
          k.costoVentas,
          k.finalCant,
          k.finalTotal,
          '',
        ],
      },
    ],
    advertencias: [],
    interpretacion: [
      input.metodo === 'promedio'
        ? 'Con el promedio ponderado cada venta sale al costo promedio del inventario en ese momento; el costo promedio cambia con cada compra.'
        : 'Con PEPS las primeras unidades que entraron son las primeras que salen: el inventario final queda valorado a los costos más recientes.',
      `Costo de ventas: ${es(k.costoVentas)}; inventario final: ${es(k.finalCant, 0)} unidades por ${es(k.finalTotal)}.`,
    ],
  };
}

function toSheet(input: KardexInput): SheetExport {
  const k = runKardex(input);
  const sb = new SheetBuilder().text(
    'A1',
    `Kardex · ${input.producto || 'Producto'} · ${input.metodo === 'promedio' ? 'promedio ponderado' : 'PEPS'}`,
  );
  const header = 3;
  [
    'Fecha',
    'Detalle',
    'Entrada cant.',
    'Entrada C.U.',
    'Entrada total',
    'Salida cant.',
    'Salida C.U.',
    'Salida total',
    'Saldo cant.',
    'Saldo total',
  ].forEach((t, c) => sb.set(`${'ABCDEFGHIJ'[c]}${header}`, t));
  k.filas.forEach((f, i) => {
    const r = header + 1 + i;
    sb.text(`A${r}`, f.fecha).text(`B${r}`, f.detalle);
    if (i === 0) {
      sb.set(`I${r}`, f.saldoCant, 'entero').set(
        `J${r}`,
        `=ROUND(${xl(input.inicial.cantidad)}*${xl(input.inicial.costoUnitario)},2)`,
        'moneda',
      );
      return;
    }
    const prev = r - 1;
    if (f.entradaCant !== null) {
      sb.set(`C${r}`, f.entradaCant, 'entero')
        .set(`D${r}`, f.entradaCU ?? 0, 'numero')
        .set(`E${r}`, `=ROUND(C${r}*D${r},2)`, 'moneda')
        .set(`I${r}`, `=I${prev}+C${r}`, 'entero')
        .set(`J${r}`, `=ROUND(J${prev}+E${r},2)`, 'moneda');
      return;
    }
    sb.set(`F${r}`, f.salidaCant ?? 0, 'entero');
    if (input.metodo === 'promedio') {
      sb.set(`G${r}`, `=J${prev}/I${prev}`, 'numero').set(
        `H${r}`,
        `=IF(F${r}=I${prev},J${prev},ROUND(F${r}*G${r},2))`,
        'moneda',
      );
    } else {
      // PEPS layers are not a formula in a spreadsheet: the unit cost of each layer is written as a value.
      sb.set(`G${r}`, f.salidaCU ?? 0, 'numero').set(
        `H${r}`,
        `=IF(I${prev}-F${r}=0,J${prev},ROUND(F${r}*G${r},2))`,
        'moneda',
      );
    }
    sb.set(`I${r}`, `=I${prev}-F${r}`, 'entero').set(`J${r}`, `=ROUND(J${prev}-H${r},2)`, 'moneda');
  });
  const first = header + 1;
  const last = header + k.filas.length;
  const tot = last + 1;
  sb.set(`B${tot}`, 'Totales')
    .check(`E${tot}`, `=ROUND(SUM(E${first}:E${last}),2)`, k.compras, 'Compras', 'moneda')
    .check(`H${tot}`, `=ROUND(SUM(H${first}:H${last}),2)`, k.costoVentas, 'Costo de ventas', 'moneda')
    .check(`I${tot}`, `=I${last}`, k.finalCant, 'Unidades finales', 'entero')
    .check(`J${tot}`, `=J${last}`, k.finalTotal, 'Inventario final', 'moneda')
    .set(`B${tot + 1}`, 'Comprobación: inicial + compras − costo de ventas')
    .check(
      `J${tot + 1}`,
      `=ROUND(J${first}+E${tot}-H${tot},2)`,
      k.finalTotal,
      'Inventario final por diferencia',
      'moneda',
    );
  return sb.build();
}

export const kardex: DeliverableDefinition<KardexInput> = {
  id: 'kardex',
  parse: (raw) => inputSchema.parse(raw),
  ejemplo: {
    producto: 'Cuadernos universitarios',
    metodo: 'promedio',
    inicial: { fecha: '01/03', cantidad: 100, costoUnitario: 10 },
    movimientos: [
      { fecha: '05/03', detalle: 'Compra fact. 101', tipo: 'compra', cantidad: 100, costoUnitario: 12 },
      { fecha: '10/03', detalle: 'Venta fact. 501', tipo: 'venta', cantidad: 120, costoUnitario: 0 },
      { fecha: '18/03', detalle: 'Compra fact. 145', tipo: 'compra', cantidad: 50, costoUnitario: 13 },
      { fecha: '25/03', detalle: 'Venta fact. 533', tipo: 'venta', cantidad: 60, costoUnitario: 0 },
    ],
  },
  compute,
  toSheet,
  fuentes: ['os-pfa'],
  cifras: [],
};

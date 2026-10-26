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
 * Depreciation schedule by four methods, as in OpenStax Principles of Accounting vol. 1, 11.3 (the same source as
 * the verified formulas): straight line and sum of the years' digits reach the residual value exactly in the last
 * year (it absorbs the cents); double declining balance and units of production never go below the residual
 * value, and nothing forces them to reach it.
 */
export type MetodoDepreciacion = 'linea-recta' | 'suma-digitos' | 'doble-saldo' | 'unidades';
export const MAX_ANIOS = 50;

const inputSchema = z.object({
  activo: z.string().max(120).default('Activo fijo'),
  costo: z.number(),
  valorResidual: z.number(),
  vidaUtil: z.number(),
  metodo: z.enum(['linea-recta', 'suma-digitos', 'doble-saldo', 'unidades']),
  unidadesTotales: z.number().default(0),
  unidadesPorAnio: z.array(z.number()).max(MAX_ANIOS).default([]),
});
export type DepreciacionInput = z.infer<typeof inputSchema>;

export interface DepreciacionRow {
  anio: number;
  depreciacion: number;
  acumulada: number;
  valorLibros: number;
}

function validate(input: DepreciacionInput): void {
  const errores: string[] = [];
  if (!(input.costo > 0)) errores.push('El costo del activo tiene que ser mayor que cero.');
  if (!(input.valorResidual >= 0) || input.valorResidual >= input.costo) {
    errores.push('El valor residual tiene que ser mayor o igual a cero y menor que el costo.');
  }
  if (
    input.metodo !== 'unidades' &&
    (!Number.isInteger(input.vidaUtil) || input.vidaUtil < 1 || input.vidaUtil > MAX_ANIOS)
  ) {
    errores.push(`La vida útil tiene que ser un número entero de 1 a ${MAX_ANIOS} años.`);
  }
  if (input.metodo === 'unidades') {
    if (!(input.unidadesTotales > 0))
      errores.push('Escribe las unidades que producirá el activo en toda su vida útil.');
    if (input.unidadesPorAnio.length === 0) errores.push('Escribe las unidades producidas en cada año.');
    if (input.unidadesPorAnio.some((u) => !(u >= 0)))
      errores.push('Las unidades de cada año no pueden ser negativas.');
    const total = input.unidadesPorAnio.reduce((s, u) => s + u, 0);
    if (total > input.unidadesTotales)
      errores.push('Las unidades de los años suman más que las de toda la vida útil.');
  }
  if (errores.length > 0) throw new DeliverableError(errores);
}

export function depreciationRows(input: DepreciacionInput): DepreciacionRow[] {
  validate(input);
  const costo = round2(input.costo);
  const vr = round2(input.valorResidual);
  const base = round2(costo - vr);
  const n = input.metodo === 'unidades' ? input.unidadesPorAnio.length : input.vidaUtil;
  const suma = (n * (n + 1)) / 2;
  const rows: DepreciacionRow[] = [];
  let vl = costo;
  for (let k = 1; k <= n; k += 1) {
    const room = round2(vl - vr);
    let dep: number;
    switch (input.metodo) {
      case 'linea-recta':
        dep = k === n ? room : round2(base / n);
        break;
      case 'suma-digitos':
        dep = k === n ? room : round2((base * (n - k + 1)) / suma);
        break;
      case 'doble-saldo':
        dep = Math.min(round2((vl * 2) / n), room);
        break;
      case 'unidades':
        dep = Math.min(round2((base / input.unidadesTotales) * (input.unidadesPorAnio[k - 1] ?? 0)), room);
        break;
    }
    vl = round2(vl - dep);
    rows.push({ anio: k, depreciacion: dep, acumulada: round2(costo - vl), valorLibros: vl });
  }
  return rows;
}

const METODO_LABEL: Record<MetodoDepreciacion, string> = {
  'linea-recta': 'línea recta',
  'suma-digitos': 'suma de dígitos de los años',
  'doble-saldo': 'doble saldo decreciente',
  unidades: 'unidades de producción',
};

function compute(input: DepreciacionInput): DeliverableResult {
  const rows = depreciationRows(input);
  const costo = round2(input.costo);
  const vr = round2(input.valorResidual);
  const base = round2(costo - vr);
  const n = rows.length;
  const first = rows[0]!;
  const last = rows[n - 1]!;
  const total = round2(rows.reduce((s, r) => s + r.depreciacion, 0));
  const pasos: Step[] = [
    {
      titulo: 'Base depreciable',
      expresion: `Costo − valor residual = ${es(costo)} − ${es(vr)} = ${es(base)}`,
      calculo: `=${xl(costo)}-${xl(vr)}`,
      resultado: base,
      formato: 'money',
    },
  ];
  switch (input.metodo) {
    case 'linea-recta':
      pasos.push({
        titulo: 'Depreciación anual',
        expresion: `${es(base)} ÷ ${n} años = ${es(first.depreciacion)}`,
        calculo: `=ROUND(${xl(base)}/${n},2)`,
        resultado: first.depreciacion,
        formato: 'money',
      });
      break;
    case 'suma-digitos': {
      const suma = (n * (n + 1)) / 2;
      pasos.push(
        {
          titulo: 'Suma de los dígitos de los años',
          expresion: `n(n + 1) ÷ 2 = ${n} × ${n + 1} ÷ 2 = ${suma}`,
          calculo: `=${n}*${n + 1}/2`,
          resultado: suma,
          formato: 'integer',
        },
        {
          titulo: 'Depreciación del año 1',
          expresion: `${es(base)} × ${n}/${suma} = ${es(first.depreciacion)}`,
          calculo: `=ROUND(${xl(base)}*${n}/${suma},2)`,
          resultado: first.depreciacion,
          formato: 'money',
        },
      );
      break;
    }
    case 'doble-saldo':
      pasos.push(
        {
          titulo: 'Tasa del doble saldo',
          expresion: `2 ÷ ${n} = ${es((2 / n) * 100, 4)} % del valor en libros de cada año`,
          calculo: `=2/${n}`,
          resultado: 2 / n,
          formato: 'percent',
        },
        {
          titulo: 'Depreciación del año 1',
          expresion: `${es(costo)} × ${es(2 / n, 6)} = ${es(first.depreciacion)} (el residual no entra en la base)`,
          calculo: `=MIN(ROUND(${xl(costo)}*2/${n},2),${xl(costo)}-${xl(vr)})`,
          resultado: first.depreciacion,
          formato: 'money',
        },
      );
      break;
    case 'unidades': {
      const rate = base / input.unidadesTotales;
      pasos.push(
        {
          titulo: 'Depreciación por unidad',
          expresion: `${es(base)} ÷ ${es(input.unidadesTotales, 0)} unidades = ${es(rate, 6)} por unidad`,
          calculo: `=${xl(base)}/${xl(input.unidadesTotales)}`,
          resultado: rate,
          formato: 'number',
        },
        {
          titulo: 'Depreciación del año 1',
          expresion: `${es(rate, 6)} × ${es(input.unidadesPorAnio[0] ?? 0, 0)} unidades = ${es(first.depreciacion)}`,
          calculo: `=MIN(ROUND(${xl(base)}/${xl(input.unidadesTotales)}*${xl(input.unidadesPorAnio[0] ?? 0)},2),${xl(costo)}-${xl(vr)})`,
          resultado: first.depreciacion,
          formato: 'money',
        },
      );
      break;
    }
  }
  pasos.push(
    {
      titulo: 'Valor en libros al final del año 1',
      expresion: `${es(costo)} − ${es(first.depreciacion)} = ${es(first.valorLibros)}`,
      calculo: `=${xl(costo)}-${xl(first.depreciacion)}`,
      resultado: first.valorLibros,
      formato: 'money',
    },
    {
      titulo: 'Depreciación acumulada total',
      expresion: `Suma de los ${n} años = ${es(total)}`,
      calculo: `=${rows.map((r) => xl(r.depreciacion)).join('+')}`,
      resultado: total,
      formato: 'money',
    },
    {
      titulo: 'Valor en libros final',
      expresion: `${es(costo)} − ${es(total)} = ${es(last.valorLibros)}`,
      calculo: `=${xl(costo)}-${xl(total)}`,
      resultado: last.valorLibros,
      formato: 'money',
    },
  );
  const advertencias: string[] = [];
  if (last.valorLibros > vr) {
    advertencias.push(
      `Con ${METODO_LABEL[input.metodo]} el valor en libros final (${es(last.valorLibros)}) queda sobre el residual (${es(vr)}). Algunos docentes ajustan el último año para llegar al residual: confirma la regla de tu curso.`,
    );
  }
  return {
    resumen: [
      { etiqueta: 'Depreciación del año 1', valor: first.depreciacion, formato: 'money', destacado: true },
      { etiqueta: 'Depreciación acumulada total', valor: total, formato: 'money' },
      { etiqueta: 'Valor en libros final', valor: last.valorLibros, formato: 'money' },
    ],
    pasos,
    tablas: [
      {
        id: 'depreciacion',
        titulo: `Depreciación por ${METODO_LABEL[input.metodo]}: ${input.activo || 'activo'}`,
        columnas: [
          { titulo: 'Año', formato: 'integer' },
          { titulo: 'Depreciación', formato: 'money' },
          { titulo: 'Depreciación acumulada', formato: 'money' },
          { titulo: 'Valor en libros', formato: 'money' },
        ],
        filas: [
          [0, null, null, costo],
          ...rows.map((r) => [r.anio, r.depreciacion, r.acumulada, r.valorLibros]),
        ],
        total: ['Total', total, null, null],
      },
    ],
    advertencias,
    interpretacion: [
      `Cada año se registra el gasto por depreciación (débito) contra la depreciación acumulada (crédito); el activo queda en el balance por su valor en libros.`,
      input.metodo === 'linea-recta'
        ? 'La línea recta reparte el mismo gasto todos los años.'
        : input.metodo === 'unidades'
          ? 'El gasto sigue al uso real del activo: más producción, más depreciación.'
          : 'Es un método acelerado: el gasto es mayor en los primeros años y menor al final.',
    ],
  };
}

function toSheet(input: DepreciacionInput, result: DeliverableResult): SheetExport {
  const rows = depreciationRows(input);
  const n = rows.length;
  const sb = new SheetBuilder()
    .text('A1', input.activo || 'Activo fijo')
    .set('A2', 'Costo')
    .set('B2', round2(input.costo), 'moneda')
    .set('A3', 'Valor residual')
    .set('B3', round2(input.valorResidual), 'moneda')
    .set('A4', input.metodo === 'unidades' ? 'Unidades de toda la vida útil' : 'Vida útil (años)')
    .set('B4', input.metodo === 'unidades' ? input.unidadesTotales : n, 'entero')
    .set('A5', 'Base depreciable')
    .set('B5', '=B2-B3', 'moneda');
  const header = 7;
  const cols =
    input.metodo === 'unidades'
      ? ['Año', 'Unidades', 'Depreciación', 'Acumulada', 'Valor en libros']
      : ['Año', 'Depreciación', 'Acumulada', 'Valor en libros'];
  cols.forEach((t, c) => sb.set(`${'ABCDE'[c]}${header}`, t));
  const dep = input.metodo === 'unidades' ? 'C' : 'B';
  const acc = input.metodo === 'unidades' ? 'D' : 'C';
  const vlc = input.metodo === 'unidades' ? 'E' : 'D';
  sb.set(`A${header + 1}`, 0, 'entero').set(`${vlc}${header + 1}`, '=B2', 'moneda');
  rows.forEach((r, idx) => {
    const row = header + 2 + idx;
    const prev = row - 1;
    const room = `${vlc}${prev}-$B$3`;
    const k = r.anio;
    let formula: string;
    switch (input.metodo) {
      case 'linea-recta':
        formula = k === n ? `=${room}` : `=ROUND($B$5/${n},2)`;
        break;
      case 'suma-digitos':
        formula = k === n ? `=${room}` : `=ROUND($B$5*(${n}-A${row}+1)/(${n}*(${n}+1)/2),2)`;
        break;
      case 'doble-saldo':
        formula = `=MIN(ROUND(${vlc}${prev}*2/${n},2),${room})`;
        break;
      case 'unidades':
        sb.set(`B${row}`, input.unidadesPorAnio[idx] ?? 0, 'entero');
        formula = `=MIN(ROUND($B$5/$B$4*B${row},2),${room})`;
        break;
    }
    sb.set(`A${row}`, k, 'entero')
      .set(`${dep}${row}`, formula, 'moneda')
      .set(`${acc}${row}`, `=$B$2-${vlc}${row}`, 'moneda')
      .set(`${vlc}${row}`, `=ROUND(${vlc}${prev}-${dep}${row},2)`, 'moneda');
  });
  const firstRow = header + 2;
  const lastRow = header + 1 + n;
  sb.check(
    `${dep}${firstRow}`,
    sb.build().cells[`${dep}${firstRow}`] ?? '',
    rows[0]!.depreciacion,
    'Depreciación del año 1',
    'moneda',
  );
  sb.set(`A${lastRow + 1}`, 'Total').check(
    `${dep}${lastRow + 1}`,
    `=ROUND(SUM(${dep}${firstRow}:${dep}${lastRow}),2)`,
    Number(result.tablas[0]?.total?.[1]),
    'Depreciación acumulada total',
    'moneda',
  );
  sb.check(
    `${vlc}${lastRow}`,
    `=ROUND(${vlc}${lastRow - 1}-${dep}${lastRow},2)`,
    rows[n - 1]!.valorLibros,
    'Valor en libros final',
    'moneda',
  );
  return sb.build();
}

export const depreciacion: DeliverableDefinition<DepreciacionInput> = {
  id: 'depreciacion',
  parse: (raw) => inputSchema.parse(raw),
  ejemplo: {
    activo: 'Furgoneta de reparto',
    costo: 58_000,
    valorResidual: 10_000,
    vidaUtil: 5,
    metodo: 'doble-saldo',
    unidadesTotales: 0,
    unidadesPorAnio: [],
  },
  compute,
  toSheet,
  fuentes: ['os-pfa'],
  cifras: [],
};

import { z } from '../zod';
import { cvp } from '../tools/finance';
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
 * Break-even point in units and in dollars, units for a target profit, margin of safety and operating leverage.
 * Source: OpenStax, Principles of Managerial Accounting, ch. 3 (same as the verified formulas).
 */
const inputSchema = z.object({
  producto: z.string().max(120).default('Producto'),
  precio: z.number(),
  costoVariable: z.number(),
  costosFijos: z.number(),
  ventasEsperadas: z.number().default(0),
  utilidadObjetivo: z.number().default(0),
});
export type PuntoEquilibrioInput = z.infer<typeof inputSchema>;

function run(input: PuntoEquilibrioInput) {
  const errores: string[] = [];
  if (!(input.precio > 0)) errores.push('El precio de venta tiene que ser mayor que cero.');
  if (!(input.costoVariable >= 0)) errores.push('El costo variable unitario no puede ser negativo.');
  if (!(input.costosFijos >= 0)) errores.push('Los costos fijos no pueden ser negativos.');
  if (!(input.ventasEsperadas >= 0)) errores.push('Las ventas esperadas no pueden ser negativas.');
  if (!(input.utilidadObjetivo >= 0)) errores.push('La utilidad deseada no puede ser negativa.');
  if (input.precio <= input.costoVariable) {
    errores.push(
      'El precio tiene que ser mayor que el costo variable unitario: si no, nunca hay punto de equilibrio.',
    );
  }
  if (errores.length > 0) throw new DeliverableError(errores);
  const r = cvp({
    precio: input.precio,
    costoVariable: input.costoVariable,
    costosFijos: input.costosFijos,
    ventasUnidades: input.ventasEsperadas,
  });
  const unidadesObjetivo = (input.costosFijos + input.utilidadObjetivo) / r.margenUnitario;
  return { ...r, unidadesObjetivo };
}

function compute(input: PuntoEquilibrioInput): DeliverableResult {
  const r = run(input);
  const { precio: p, costoVariable: cv, costosFijos: cf, ventasEsperadas: q, utilidadObjetivo: uo } = input;
  const peU = round2(r.equilibrioUnidades);
  const peEnteras = Math.ceil(r.equilibrioUnidades - 1e-9);
  const peD = round2(r.equilibrioDolares);
  const pasos: Step[] = [
    {
      titulo: 'Margen de contribución unitario',
      expresion: `Precio − costo variable = ${es(p)} − ${es(cv)} = ${es(r.margenUnitario)}`,
      calculo: `=${xl(p)}-${xl(cv)}`,
      resultado: r.margenUnitario,
      formato: 'money',
    },
    {
      titulo: 'Razón de margen de contribución',
      expresion: `${es(r.margenUnitario)} ÷ ${es(p)} = ${es(r.razonMargen * 100, 4)} %`,
      calculo: `=(${xl(p)}-${xl(cv)})/${xl(p)}`,
      resultado: r.razonMargen,
      formato: 'percent',
    },
    {
      titulo: 'Punto de equilibrio en unidades',
      expresion: `Costos fijos ÷ margen unitario = ${es(cf)} ÷ ${es(r.margenUnitario)} = ${es(peU)} unidades`,
      calculo: `=ROUND(${xl(cf)}/(${xl(p)}-${xl(cv)}),2)`,
      resultado: peU,
      formato: 'number',
    },
    {
      titulo: 'Unidades enteras que hay que vender',
      expresion: `Se redondea hacia arriba: ${peEnteras} unidades`,
      calculo: `=ROUNDUP(${xl(cf)}/(${xl(p)}-${xl(cv)})-0.000000001,0)`,
      resultado: peEnteras,
      formato: 'integer',
    },
    {
      titulo: 'Punto de equilibrio en dólares',
      expresion: `Costos fijos ÷ razón de margen = ${es(cf)} ÷ ${es(r.razonMargen, 6)} = ${es(peD)}`,
      calculo: `=ROUND(${xl(cf)}/((${xl(p)}-${xl(cv)})/${xl(p)}),2)`,
      resultado: peD,
      formato: 'money',
    },
  ];
  const resumen: DeliverableResult['resumen'] = [
    { etiqueta: 'Punto de equilibrio', valor: peU, formato: 'number', destacado: true },
    { etiqueta: 'Unidades enteras a vender', valor: peEnteras, formato: 'integer' },
    { etiqueta: 'Ventas de equilibrio', valor: peD, formato: 'money' },
    { etiqueta: 'Margen de contribución unitario', valor: r.margenUnitario, formato: 'money' },
  ];
  if (uo > 0) {
    const uObj = round2(r.unidadesObjetivo);
    pasos.push({
      titulo: 'Unidades para la utilidad deseada',
      expresion: `(Costos fijos + utilidad) ÷ margen = (${es(cf)} + ${es(uo)}) ÷ ${es(r.margenUnitario)} = ${es(uObj)}`,
      calculo: `=ROUND((${xl(cf)}+${xl(uo)})/(${xl(p)}-${xl(cv)}),2)`,
      resultado: uObj,
      formato: 'number',
    });
    resumen.push({ etiqueta: `Unidades para ganar ${es(uo)}`, valor: uObj, formato: 'number' });
  }
  const interpretacion = [
    `Cada unidad vendida deja ${es(r.margenUnitario)} para cubrir los costos fijos; con ${es(peU)} unidades (${es(peD)} en ventas) la utilidad es cero.`,
  ];
  const advertencias: string[] = [];
  if (q > 0) {
    const utilidad = round2(r.utilidad);
    pasos.push({
      titulo: 'Utilidad con las ventas esperadas',
      expresion: `Margen × unidades − costos fijos = ${es(r.margenUnitario)} × ${es(q, 0)} − ${es(cf)} = ${es(utilidad)}`,
      calculo: `=(${xl(p)}-${xl(cv)})*${xl(q)}-${xl(cf)}`,
      resultado: utilidad,
      formato: 'money',
    });
    resumen.push({ etiqueta: 'Utilidad con las ventas esperadas', valor: utilidad, formato: 'money' });
    if (r.margenSeguridadUnidades > 0) {
      pasos.push({
        titulo: 'Margen de seguridad',
        expresion: `(Ventas − equilibrio) ÷ ventas = (${es(q, 0)} − ${es(peU)}) ÷ ${es(q, 0)} = ${es(r.margenSeguridadPct * 100, 2)} %`,
        calculo: `=(${xl(q)}-${xl(cf)}/(${xl(p)}-${xl(cv)}))/${xl(q)}`,
        resultado: r.margenSeguridadPct,
        formato: 'percent',
      });
      resumen.push({ etiqueta: 'Margen de seguridad', valor: r.margenSeguridadPct, formato: 'percent' });
      interpretacion.push(
        `Las ventas esperadas pueden caer ${es(r.margenSeguridadPct * 100, 2)} % antes de que la empresa tenga pérdidas.`,
      );
    } else {
      advertencias.push(
        'Con las ventas esperadas la empresa no llega al punto de equilibrio: tendría pérdidas.',
      );
    }
    if (r.apalancamientoOperativo !== null) {
      pasos.push({
        titulo: 'Grado de apalancamiento operativo',
        expresion: `Margen de contribución total ÷ utilidad = ${es(r.margenUnitario * q)} ÷ ${es(utilidad)} = ${es(r.apalancamientoOperativo, 4)}`,
        calculo: `=(${xl(p)}-${xl(cv)})*${xl(q)}/((${xl(p)}-${xl(cv)})*${xl(q)}-${xl(cf)})`,
        resultado: r.apalancamientoOperativo,
        formato: 'number',
      });
      interpretacion.push(
        `Con un apalancamiento operativo de ${es(r.apalancamientoOperativo, 2)}, si las ventas suben 10 % la utilidad sube ${es(r.apalancamientoOperativo * 10, 2)} %.`,
      );
    }
  }
  const peVentas = round2(peU * p);
  const peCV = round2(peU * cv);
  return {
    resumen,
    pasos,
    tablas: [
      {
        id: 'estado-equilibrio',
        titulo: 'Estado de resultados en el punto de equilibrio',
        columnas: [
          { titulo: 'Concepto', formato: 'text' },
          { titulo: 'Valor', formato: 'money' },
        ],
        filas: [
          [`Ventas (${es(peU)} × ${es(p)})`, peVentas],
          [`(−) Costos variables (${es(peU)} × ${es(cv)})`, peCV],
          ['(=) Margen de contribución', round2(peVentas - peCV)],
          ['(−) Costos fijos', round2(cf)],
          ['(=) Utilidad', round2(peVentas - peCV - cf)],
        ],
      },
    ],
    advertencias,
    interpretacion,
  };
}

function toSheet(input: PuntoEquilibrioInput, result: DeliverableResult): SheetExport {
  const r = run(input);
  const sb = new SheetBuilder()
    .text('A1', input.producto || 'Producto')
    .set('A2', 'Precio de venta')
    .set('B2', input.precio, 'moneda')
    .set('A3', 'Costo variable unitario')
    .set('B3', input.costoVariable, 'moneda')
    .set('A4', 'Costos fijos')
    .set('B4', input.costosFijos, 'moneda')
    .set('A5', 'Ventas esperadas (unidades)')
    .set('B5', input.ventasEsperadas, 'numero')
    .set('A6', 'Utilidad deseada')
    .set('B6', input.utilidadObjetivo, 'moneda')
    .set('A8', 'Margen de contribución unitario')
    .check('B8', '=B2-B3', r.margenUnitario, 'Margen unitario', 'moneda')
    .set('A9', 'Razón de margen de contribución')
    .check('B9', '=B8/B2', r.razonMargen, 'Razón de margen', 'porcentaje')
    .set('A10', 'Punto de equilibrio (unidades)')
    .check('B10', '=ROUND(B4/B8,2)', round2(r.equilibrioUnidades), 'Punto de equilibrio', 'numero')
    .set('A11', 'Punto de equilibrio (dólares)')
    .check('B11', '=ROUND(B4/B9,2)', round2(r.equilibrioDolares), 'Ventas de equilibrio', 'moneda')
    .set('A12', 'Unidades para la utilidad deseada')
    .check('B12', '=ROUND((B4+B6)/B8,2)', round2(r.unidadesObjetivo), 'Unidades para la utilidad', 'numero');
  if (input.ventasEsperadas > 0) {
    sb.set('A13', 'Utilidad con las ventas esperadas').check(
      'B13',
      '=B8*B5-B4',
      round2(r.utilidad),
      'Utilidad esperada',
      'moneda',
    );
  }
  const t = result.tablas[0]!;
  sb.set('A15', t.titulo);
  t.filas.forEach((f, i) => sb.text(`A${16 + i}`, String(f[0])).set(`B${16 + i}`, Number(f[1]), 'moneda'));
  return sb.build();
}

export const puntoEquilibrio: DeliverableDefinition<PuntoEquilibrioInput> = {
  id: 'punto-equilibrio',
  parse: (raw) => inputSchema.parse(raw),
  ejemplo: {
    producto: 'Mochilas',
    precio: 20,
    costoVariable: 12,
    costosFijos: 8_000,
    ventasEsperadas: 1_400,
    utilidadObjetivo: 4_000,
  },
  compute,
  toSheet,
  fuentes: ['os-pma'],
  cifras: [],
};

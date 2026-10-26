import { z } from '../zod';
import { irr, npv, payback, profitabilityIndex } from '../tools/finance';
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
 * Capital budgeting of a project: NPV, IRR, profitability index (benefit–cost ratio) and simple and discounted
 * payback. Flow t is discounted t years. Source: OpenStax, Principles of Finance 2e, ch. 16.
 */
export const MAX_FLUJOS = 30;

const inputSchema = z.object({
  proyecto: z.string().max(120).default('Proyecto'),
  inversion: z.number(),
  flujos: z.array(z.number()).max(MAX_FLUJOS),
  tasa: z.number(),
});
export type EvaluacionInput = z.infer<typeof inputSchema>;

function validate(input: EvaluacionInput): number[] {
  const errores: string[] = [];
  if (!(input.inversion > 0)) errores.push('La inversión inicial tiene que ser mayor que cero.');
  if (input.flujos.length === 0) errores.push('Escribe al menos el flujo del año 1.');
  if (input.flujos.some((f) => !Number.isFinite(f)))
    errores.push('Revisa los flujos: hay un valor que no es un número.');
  if (!Number.isFinite(input.tasa) || input.tasa <= -100 || input.tasa > 200) {
    errores.push('La tasa de descuento tiene que estar entre −100 % y 200 %.');
  }
  if (errores.length > 0) throw new DeliverableError(errores);
  return [-round2(input.inversion), ...input.flujos.map(round2)];
}

function compute(input: EvaluacionInput): DeliverableResult {
  const flujos = validate(input);
  const i = input.tasa / 100;
  const factors = flujos.map((_, t) => 1 / (1 + i) ** t);
  const discounted = flujos.map((f, t) => round2(f * factors[t]!));
  const van = round2(npv(i, flujos));
  const tir = irr(flujos);
  const ir = profitabilityIndex(i, flujos);
  const pbSimple = payback(flujos);
  const pbDesc = payback(flujos, i);
  const pvFuture = round2(npv(i, [0, ...flujos.slice(1)]));
  const pasos: Step[] = flujos.slice(1).map((f, idx) => {
    const t = idx + 1;
    return {
      titulo: `Valor presente del flujo del año ${t}`,
      expresion: `${es(f)} ÷ (1 + ${es(i, 6)})^${t} = ${es(f / (1 + i) ** t)}`,
      calculo: `=${xl(f)}/(1+${xl(i)})^${t}`,
      resultado: f / (1 + i) ** t,
      formato: 'money',
    };
  });
  pasos.push(
    {
      titulo: 'Valor presente de los flujos futuros',
      expresion: `Suma de los valores presentes = ${es(pvFuture)}`,
      calculo: `=ROUND(${flujos
        .slice(1)
        .map((f, idx) => `${xl(f)}/(1+${xl(i)})^${idx + 1}`)
        .join('+')},2)`,
      resultado: pvFuture,
      formato: 'money',
    },
    {
      titulo: 'Valor actual neto (VAN)',
      expresion: `VAN = ${es(pvFuture)} − ${es(input.inversion)} = ${es(van)}`,
      calculo: `=ROUND(NPV(${xl(i)},${flujos.slice(1).map(xl).join(',')})-${xl(-flujos[0]!)},2)`,
      resultado: van,
      formato: 'money',
    },
  );
  if (ir !== null) {
    pasos.push({
      titulo: 'Índice de rentabilidad (beneficio/costo)',
      expresion: `${es(pvFuture)} ÷ ${es(input.inversion)} = ${es(ir, 4)}`,
      calculo: `=NPV(${xl(i)},${flujos.slice(1).map(xl).join(',')})/${xl(-flujos[0]!)}`,
      resultado: ir,
      formato: 'number',
    });
  }
  if (tir !== null) {
    pasos.push({
      titulo: 'Tasa interna de retorno (TIR)',
      expresion: `Tasa que hace VAN = 0: ${es(tir * 100, 2)} % (la hoja la calcula con =TIR)`,
      calculo: `=IRR({${flujos.map(xl).join(',')}})`,
      resultado: tir,
      formato: 'percent',
    });
  }
  const advertencias: string[] = [];
  const changes = flujos
    .filter((f) => f !== 0)
    .reduce((n, f, idx, arr) => (idx > 0 && Math.sign(f) !== Math.sign(arr[idx - 1]!) ? n + 1 : n), 0);
  if (changes > 1)
    advertencias.push(
      'Los flujos cambian de signo más de una vez: el proyecto puede tener varias TIR; decide con el VAN.',
    );
  if (tir === null)
    advertencias.push('No hay una tasa que haga cero el VAN con estos flujos: no se informa TIR.');

  let acumulado = 0;
  let acumuladoDesc = 0;
  const filas = flujos.map((f, t) => {
    acumulado = round2(acumulado + f);
    acumuladoDesc = round2(acumuladoDesc + discounted[t]!);
    return [t, f, round4(factors[t]!), discounted[t]!, acumulado, acumuladoDesc];
  });
  const interpretacion = [
    van > 0
      ? `El VAN es positivo (${es(van)}): con una tasa exigida de ${es(input.tasa)} % el proyecto recupera la inversión y además genera ese valor en dólares de hoy.`
      : van < 0
        ? `El VAN es negativo (${es(van)}): con una tasa exigida de ${es(input.tasa)} % el proyecto no alcanza a recuperar la inversión con ese rendimiento.`
        : 'El VAN es cero: el proyecto rinde exactamente la tasa exigida.',
  ];
  if (tir !== null) {
    interpretacion.push(
      tir > i
        ? `La TIR (${es(tir * 100, 2)} %) supera la tasa exigida (${es(input.tasa)} %), lo que coincide con un VAN positivo.`
        : `La TIR (${es(tir * 100, 2)} %) no supera la tasa exigida (${es(input.tasa)} %).`,
    );
  }
  if (pbSimple !== null) {
    interpretacion.push(
      `La inversión se recupera en ${es(pbSimple, 2)} años sin descontar${pbDesc !== null ? ` y en ${es(pbDesc, 2)} años con flujos descontados` : '; con flujos descontados no se recupera dentro del horizonte'}.`,
    );
  }
  return {
    resumen: [
      { etiqueta: 'VAN', valor: van, formato: 'money', destacado: true },
      {
        etiqueta: 'TIR',
        valor: tir === null ? 'No existe' : tir,
        formato: tir === null ? 'text' : 'percent',
      },
      {
        etiqueta: 'Índice de rentabilidad',
        valor: ir === null ? '—' : ir,
        formato: ir === null ? 'text' : 'number',
      },
      {
        etiqueta: 'Recuperación (años)',
        valor: pbSimple === null ? 'No se recupera' : round2(pbSimple),
        formato: pbSimple === null ? 'text' : 'number',
      },
      {
        etiqueta: 'Recuperación descontada (años)',
        valor: pbDesc === null ? 'No se recupera' : round2(pbDesc),
        formato: pbDesc === null ? 'text' : 'number',
      },
    ],
    pasos,
    tablas: [
      {
        id: 'flujos',
        titulo: `Flujos descontados al ${es(input.tasa)} %`,
        columnas: [
          { titulo: 'Año', formato: 'integer' },
          { titulo: 'Flujo', formato: 'money' },
          { titulo: 'Factor 1/(1+i)^t', formato: 'number' },
          { titulo: 'Flujo descontado', formato: 'money' },
          { titulo: 'Acumulado', formato: 'money' },
          { titulo: 'Acumulado descontado', formato: 'money' },
        ],
        filas,
      },
    ],
    advertencias,
    interpretacion,
  };
}

function toSheet(input: EvaluacionInput, result: DeliverableResult): SheetExport {
  const flujos = validate(input);
  const i = input.tasa / 100;
  const n = flujos.length - 1;
  const sb = new SheetBuilder()
    .text('A1', input.proyecto || 'Proyecto')
    .set('A2', 'Tasa de descuento')
    .set('B2', i, 'porcentaje');
  const header = 4;
  ['Año', 'Flujo', 'Factor', 'Flujo descontado'].forEach((t, c) => sb.set(`${'ABCD'[c]}${header}`, t));
  flujos.forEach((f, t) => {
    const r = header + 1 + t;
    sb.set(`A${r}`, t, 'entero')
      .set(`B${r}`, f, 'moneda')
      .set(`C${r}`, `=1/(1+$B$2)^A${r}`, 'numero')
      .set(`D${r}`, `=ROUND(B${r}*C${r},2)`, 'moneda');
  });
  const first = header + 1;
  const last = header + 1 + n;
  const res = last + 2;
  const van = Number(result.resumen.find((s) => s.etiqueta === 'VAN')?.valor);
  sb.set(`A${res}`, 'VAN').check(
    `B${res}`,
    `=ROUND(NPV(B2,B${first + 1}:B${last})+B${first},2)`,
    van,
    'VAN',
    'moneda',
  );
  const tir = result.resumen.find((s) => s.etiqueta === 'TIR')?.valor;
  if (typeof tir === 'number') {
    sb.set(`A${res + 1}`, 'TIR').check(`B${res + 1}`, `=IRR(B${first}:B${last})`, tir, 'TIR', 'porcentaje');
  }
  const ir = result.resumen.find((s) => s.etiqueta === 'Índice de rentabilidad')?.valor;
  if (typeof ir === 'number') {
    sb.set(`A${res + 2}`, 'Índice de rentabilidad').check(
      `B${res + 2}`,
      `=NPV(B2,B${first + 1}:B${last})/-B${first}`,
      ir,
      'Índice de rentabilidad',
      'numero',
    );
  }
  return sb.build();
}

export const evaluacionProyecto: DeliverableDefinition<EvaluacionInput> = {
  id: 'evaluacion-proyecto',
  parse: (raw) => inputSchema.parse(raw),
  ejemplo: { proyecto: 'Horno industrial', inversion: 50_000, flujos: [20_000, 22_000, 25_000], tasa: 12 },
  compute,
  toSheet,
  fuentes: ['os-pfin2'],
  cifras: [],
};

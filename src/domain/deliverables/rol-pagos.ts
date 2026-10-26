import { z } from '../zod';
import { cifraValor } from '../content/normativa';
import { computePayroll, HORAS_MES_HABITUAL, SBU_VIGENTE, type PayrollResult } from '../tools/payroll';
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
 * Monthly payroll ("rol de pagos") and employer provisions for a group of private-sector workers in Ecuador. Each
 * worker is computed with the payroll engine (IESS rates, SBU and surcharges from content/normativa.json); the
 * vacation provision is one twenty-fourth of the earnings (Código del Trabajo, art. 71).
 */
export const MAX_TRABAJADORES = 40;

const trabajadorSchema = z.object({
  nombre: z.string().max(80).default(''),
  cargo: z.string().max(60).default(''),
  sueldo: z.number(),
  horasSuplementarias: z.number().default(0),
  horasExtraordinarias: z.number().default(0),
  comisiones: z.number().default(0),
  mesesAntiguedad: z.number().default(0),
  decimosMensualizados: z.boolean().default(false),
  otrosDescuentos: z.number().default(0),
});
const inputSchema = z.object({
  empresa: z.string().max(120).default('Empresa'),
  periodo: z.string().max(40).default(''),
  trabajadores: z.array(trabajadorSchema).max(MAX_TRABAJADORES),
});
export type RolPagosInput = z.infer<typeof inputSchema>;
type Trabajador = RolPagosInput['trabajadores'][number];

const IESS_PERSONAL = cifraValor('iess-aporte-personal');
const IESS_PATRONAL = cifraValor('iess-aporte-patronal');
const RECARGO_SUP = cifraValor('recargo-suplementarias');
const RECARGO_EXT = cifraValor('recargo-extraordinarias');

export interface WorkerPayroll {
  t: Trabajador;
  nombre: string;
  r: PayrollResult;
  horas: number;
  decimos: number;
  fondo: number;
  otros: number;
  totalDescuentos: number;
  liquido: number;
  patronal: number;
  provision13: number;
  provision14: number;
  vacaciones: number;
  costoAdicional: number;
}

function line(r: PayrollResult, start: string): number {
  return r.ingresos.filter((l) => l.concepto.startsWith(start)).reduce((s, l) => s + l.valor, 0);
}

export function runPayroll(input: RolPagosInput): WorkerPayroll[] {
  const e: string[] = [];
  if (input.trabajadores.length === 0) e.push('Agrega al menos un trabajador.');
  input.trabajadores.forEach((t, i) => {
    const who = t.nombre.trim() || `Trabajador ${i + 1}`;
    if (!(t.sueldo > 0)) e.push(`${who}: el sueldo tiene que ser mayor que cero.`);
    for (const [v, label] of [
      [t.horasSuplementarias, 'las horas suplementarias'],
      [t.horasExtraordinarias, 'las horas extraordinarias'],
      [t.comisiones, 'las comisiones'],
      [t.mesesAntiguedad, 'la antigüedad'],
      [t.otrosDescuentos, 'los otros descuentos'],
    ] as const) {
      if (!(v >= 0)) e.push(`${who}: revisa ${label}, no puede ser negativo.`);
    }
  });
  if (e.length > 0) throw new DeliverableError(e);
  return input.trabajadores.map((t, i) => {
    const r = computePayroll({
      sueldo: t.sueldo,
      horasSuplementarias: t.horasSuplementarias,
      horasNocturnas: t.horasExtraordinarias,
      comisiones: t.comisiones,
      mesesAntiguedad: t.mesesAntiguedad,
      decimosMensualizados: t.decimosMensualizados,
      sbu: SBU_VIGENTE,
      horasMes: HORAS_MES_HABITUAL,
      otrasPatronales: 0,
    });
    const horas = round2(line(r, 'Horas'));
    const decimos = round2(line(r, 'Décima'));
    const fondo = round2(line(r, 'Fondo de reserva'));
    const otros = round2(t.otrosDescuentos);
    const totalDescuentos = round2(r.totalDescuentos + otros);
    const patronal = round2(r.materiaGravadaIess * (IESS_PATRONAL / 100));
    const provision13 = t.decimosMensualizados ? 0 : round2(r.materiaGravadaIess / 12);
    const provision14 = t.decimosMensualizados ? 0 : round2(SBU_VIGENTE / 12);
    const vacaciones = round2(r.materiaGravadaIess / 24);
    return {
      t,
      nombre: t.nombre.trim() || `Trabajador ${i + 1}`,
      r,
      horas,
      decimos,
      fondo,
      otros,
      totalDescuentos,
      liquido: round2(r.totalIngresos - totalDescuentos),
      patronal,
      provision13,
      provision14,
      vacaciones,
      costoAdicional: round2(patronal + provision13 + provision14 + vacaciones),
    };
  });
}

const sum = (xs: number[]) => round2(xs.reduce((s, x) => s + x, 0));

function compute(input: RolPagosInput): DeliverableResult {
  const rows = runPayroll(input);
  const w = rows[0]!;
  const vh = w.t.sueldo / HORAS_MES_HABITUAL;
  const pasos: Step[] = [
    {
      titulo: `${w.nombre}: valor de la hora`,
      expresion: `Sueldo ÷ ${HORAS_MES_HABITUAL} horas = ${es(w.t.sueldo)} ÷ ${HORAS_MES_HABITUAL} = ${es(vh, 4)}`,
      calculo: `=${xl(w.t.sueldo)}/${HORAS_MES_HABITUAL}`,
      resultado: vh,
      formato: 'number',
    },
  ];
  if (w.t.horasSuplementarias > 0) {
    const v = round2(vh * (1 + RECARGO_SUP / 100) * w.t.horasSuplementarias);
    pasos.push({
      titulo: `${w.nombre}: horas suplementarias (recargo de ${es(RECARGO_SUP)} %)`,
      expresion: `${es(vh, 4)} × ${es(1 + RECARGO_SUP / 100)} × ${es(w.t.horasSuplementarias)} h = ${es(v)}`,
      calculo: `=ROUND(${xl(w.t.sueldo)}/${HORAS_MES_HABITUAL}*${xl(1 + RECARGO_SUP / 100)}*${xl(w.t.horasSuplementarias)},2)`,
      resultado: v,
      formato: 'money',
    });
  }
  if (w.t.horasExtraordinarias > 0) {
    const v = round2(vh * (1 + RECARGO_EXT / 100) * w.t.horasExtraordinarias);
    pasos.push({
      titulo: `${w.nombre}: horas extraordinarias (recargo de ${es(RECARGO_EXT)} %)`,
      expresion: `${es(vh, 4)} × ${es(1 + RECARGO_EXT / 100)} × ${es(w.t.horasExtraordinarias)} h = ${es(v)}`,
      calculo: `=ROUND(${xl(w.t.sueldo)}/${HORAS_MES_HABITUAL}*${xl(1 + RECARGO_EXT / 100)}*${xl(w.t.horasExtraordinarias)},2)`,
      resultado: v,
      formato: 'money',
    });
  }
  pasos.push(
    {
      titulo: `${w.nombre}: ingresos que aportan al IESS`,
      expresion: `Sueldo + horas + comisiones = ${es(w.t.sueldo)} + ${es(w.horas)} + ${es(w.t.comisiones)} = ${es(w.r.materiaGravadaIess)}`,
      calculo: `=${xl(w.t.sueldo)}+${xl(w.horas)}+${xl(w.t.comisiones)}`,
      resultado: w.r.materiaGravadaIess,
      formato: 'money',
    },
    {
      titulo: `${w.nombre}: aporte personal al IESS (${es(IESS_PERSONAL)} %)`,
      expresion: `${es(w.r.materiaGravadaIess)} × ${es(IESS_PERSONAL)} % = ${es(w.r.totalDescuentos)}`,
      calculo: `=ROUND(${xl(w.r.materiaGravadaIess)}*${xl(IESS_PERSONAL / 100)},2)`,
      resultado: w.r.totalDescuentos,
      formato: 'money',
    },
    {
      titulo: `${w.nombre}: total de ingresos del mes`,
      expresion: `Ingresos al IESS + décimos mensualizados + fondo de reserva = ${es(w.r.materiaGravadaIess)} + ${es(w.decimos)} + ${es(w.fondo)} = ${es(w.r.totalIngresos)}`,
      calculo: `=${xl(w.r.materiaGravadaIess)}+${xl(w.decimos)}+${xl(w.fondo)}`,
      resultado: w.r.totalIngresos,
      formato: 'money',
    },
    {
      titulo: `${w.nombre}: líquido a recibir`,
      expresion: `Ingresos − descuentos = ${es(w.r.totalIngresos)} − ${es(w.totalDescuentos)} = ${es(w.liquido)}`,
      calculo: `=${xl(w.r.totalIngresos)}-${xl(w.totalDescuentos)}`,
      resultado: w.liquido,
      formato: 'money',
    },
    {
      titulo: `${w.nombre}: aporte patronal (${es(IESS_PATRONAL)} %)`,
      expresion: `${es(w.r.materiaGravadaIess)} × ${es(IESS_PATRONAL)} % = ${es(w.patronal)}`,
      calculo: `=ROUND(${xl(w.r.materiaGravadaIess)}*${xl(IESS_PATRONAL / 100)},2)`,
      resultado: w.patronal,
      formato: 'money',
    },
    {
      titulo: `${w.nombre}: provisión de vacaciones (1/24, art. 71)`,
      expresion: `${es(w.r.materiaGravadaIess)} ÷ 24 = ${es(w.vacaciones)}`,
      calculo: `=ROUND(${xl(w.r.materiaGravadaIess)}/24,2)`,
      resultado: w.vacaciones,
      formato: 'money',
    },
  );
  const totLiquido = sum(rows.map((x) => x.liquido));
  const totCosto = sum(rows.map((x) => x.r.totalIngresos + x.costoAdicional));
  pasos.push(
    {
      titulo: 'Total a pagar a los trabajadores',
      expresion: `Suma de los líquidos = ${rows.map((x) => es(x.liquido)).join(' + ')} = ${es(totLiquido)}`,
      calculo: `=${rows.map((x) => xl(x.liquido)).join('+')}`,
      resultado: totLiquido,
      formato: 'money',
    },
    {
      titulo: 'Costo total del mes para la empresa',
      expresion: `Ingresos de los trabajadores + aportes patronales y provisiones = ${es(totCosto)}`,
      calculo: `=${rows.map((x) => `${xl(x.r.totalIngresos)}+${xl(x.costoAdicional)}`).join('+')}`,
      resultado: totCosto,
      formato: 'money',
    },
  );
  const advertencias = rows.flatMap((x) => x.r.advertencias.map((a) => `${x.nombre}: ${a}`));
  return {
    resumen: [
      { etiqueta: 'Total líquido a pagar', valor: totLiquido, formato: 'money', destacado: true },
      {
        etiqueta: 'Aportes personales al IESS',
        valor: sum(rows.map((x) => x.r.totalDescuentos)),
        formato: 'money',
      },
      { etiqueta: 'Aportes patronales al IESS', valor: sum(rows.map((x) => x.patronal)), formato: 'money' },
      { etiqueta: 'Costo total para la empresa', valor: totCosto, formato: 'money' },
    ],
    pasos,
    tablas: [
      {
        id: 'rol',
        titulo: `Rol de pagos${input.periodo ? ` de ${input.periodo}` : ''} · ${input.empresa || 'Empresa'}`,
        columnas: [
          { titulo: 'Trabajador', formato: 'text' },
          { titulo: 'Sueldo', formato: 'money' },
          { titulo: 'Horas extra', formato: 'money' },
          { titulo: 'Comisiones', formato: 'money' },
          { titulo: 'Décimos mensuales', formato: 'money' },
          { titulo: 'Fondo de reserva', formato: 'money' },
          { titulo: 'Total ingresos', formato: 'money' },
          { titulo: `Aporte IESS ${es(IESS_PERSONAL)} %`, formato: 'money' },
          { titulo: 'Otros descuentos', formato: 'money' },
          { titulo: 'Total descuentos', formato: 'money' },
          { titulo: 'Líquido a recibir', formato: 'money' },
        ],
        filas: rows.map((x) => [
          x.nombre,
          round2(x.t.sueldo),
          x.horas,
          round2(x.t.comisiones),
          x.decimos,
          x.fondo,
          x.r.totalIngresos,
          x.r.totalDescuentos,
          x.otros,
          x.totalDescuentos,
          x.liquido,
        ]),
        total: [
          'Totales',
          sum(rows.map((x) => x.t.sueldo)),
          sum(rows.map((x) => x.horas)),
          sum(rows.map((x) => x.t.comisiones)),
          sum(rows.map((x) => x.decimos)),
          sum(rows.map((x) => x.fondo)),
          sum(rows.map((x) => x.r.totalIngresos)),
          sum(rows.map((x) => x.r.totalDescuentos)),
          sum(rows.map((x) => x.otros)),
          sum(rows.map((x) => x.totalDescuentos)),
          totLiquido,
        ],
      },
      {
        id: 'provisiones',
        titulo: 'Aportes del empleador y provisiones',
        columnas: [
          { titulo: 'Trabajador', formato: 'text' },
          { titulo: `Aporte patronal ${es(IESS_PATRONAL)} %`, formato: 'money' },
          { titulo: 'Décima tercera', formato: 'money' },
          { titulo: 'Décima cuarta', formato: 'money' },
          { titulo: 'Vacaciones (1/24)', formato: 'money' },
          { titulo: 'Total', formato: 'money' },
        ],
        filas: rows.map((x) => [
          x.nombre,
          x.patronal,
          x.provision13,
          x.provision14,
          x.vacaciones,
          x.costoAdicional,
        ]),
        total: [
          'Totales',
          sum(rows.map((x) => x.patronal)),
          sum(rows.map((x) => x.provision13)),
          sum(rows.map((x) => x.provision14)),
          sum(rows.map((x) => x.vacaciones)),
          sum(rows.map((x) => x.costoAdicional)),
        ],
      },
    ],
    advertencias,
    interpretacion: [
      `La empresa entrega ${es(totLiquido)} a sus trabajadores, pero el mes le cuesta ${es(totCosto)} con aportes patronales y provisiones.`,
      'Las décimas que no se mensualizan se provisionan cada mes y se pagan acumuladas (la tercera hasta el 24 de diciembre; la cuarta en marzo o agosto según la región).',
    ],
  };
}

function toSheet(input: RolPagosInput, result: DeliverableResult): SheetExport {
  const rows = runPayroll(input);
  const sb = new SheetBuilder()
    .text('A1', `Rol de pagos · ${input.empresa || 'Empresa'}${input.periodo ? ` · ${input.periodo}` : ''}`)
    .set('A2', 'Horas del mes')
    .set('B2', HORAS_MES_HABITUAL, 'entero')
    .set('C2', 'Aporte personal')
    .set('D2', IESS_PERSONAL / 100, 'porcentaje')
    .set('E2', 'Aporte patronal')
    .set('F2', IESS_PATRONAL / 100, 'porcentaje')
    .set('G2', 'SBU')
    .set('H2', SBU_VIGENTE, 'moneda')
    .set('I2', 'Recargo suplementarias')
    .set('J2', RECARGO_SUP / 100, 'porcentaje')
    .set('K2', 'Recargo extraordinarias')
    .set('L2', RECARGO_EXT / 100, 'porcentaje');
  const header = 4;
  const cols = [
    'Trabajador',
    'Sueldo',
    'H. suplementarias',
    'H. extraordinarias',
    'Comisiones',
    'Meses de antigüedad',
    'Décimos mensualizados (1 = sí)',
    'Valor horas',
    'Ingresos al IESS',
    'Décimos',
    'Fondo de reserva',
    'Total ingresos',
    'Aporte personal',
    'Otros descuentos',
    'Total descuentos',
    'Líquido',
    'Aporte patronal',
    'Provisión 13.º',
    'Provisión 14.º',
    'Vacaciones',
  ];
  cols.forEach((t, c) => sb.set(`${String.fromCharCode(65 + c)}${header}`, t));
  rows.forEach((x, i) => {
    const r = header + 1 + i;
    sb.text(`A${r}`, x.nombre)
      .set(`B${r}`, x.t.sueldo, 'moneda')
      .set(`C${r}`, x.t.horasSuplementarias, 'numero')
      .set(`D${r}`, x.t.horasExtraordinarias, 'numero')
      .set(`E${r}`, x.t.comisiones, 'moneda')
      .set(`F${r}`, x.t.mesesAntiguedad, 'entero')
      .set(`G${r}`, x.t.decimosMensualizados ? 1 : 0, 'entero')
      .set(`H${r}`, `=ROUND(B${r}/$B$2*(1+$J$2)*C${r},2)+ROUND(B${r}/$B$2*(1+$L$2)*D${r},2)`, 'moneda')
      .set(`I${r}`, `=ROUND(B${r}+H${r}+E${r},2)`, 'moneda')
      .set(`J${r}`, `=IF(G${r}=1,ROUND(I${r}/12,2)+ROUND($H$2/12,2),0)`, 'moneda')
      .set(`K${r}`, `=IF(F${r}>=12,ROUND(I${r}/12,2),0)`, 'moneda')
      .set(`L${r}`, `=ROUND(I${r}+J${r}+K${r},2)`, 'moneda')
      .set(`M${r}`, `=ROUND(I${r}*$D$2,2)`, 'moneda')
      .set(`N${r}`, x.otros, 'moneda')
      .set(`O${r}`, `=M${r}+N${r}`, 'moneda')
      .check(`P${r}`, `=ROUND(L${r}-O${r},2)`, x.liquido, `Líquido de ${x.nombre}`, 'moneda')
      .check(`Q${r}`, `=ROUND(I${r}*$F$2,2)`, x.patronal, `Aporte patronal de ${x.nombre}`, 'moneda')
      .set(`R${r}`, `=IF(G${r}=1,0,ROUND(I${r}/12,2))`, 'moneda')
      .set(`S${r}`, `=IF(G${r}=1,0,ROUND($H$2/12,2))`, 'moneda')
      .check(`T${r}`, `=ROUND(I${r}/24,2)`, x.vacaciones, `Vacaciones de ${x.nombre}`, 'moneda');
  });
  const first = header + 1;
  const last = header + rows.length;
  const tot = last + 1;
  const totals = result.tablas[0]!.total!;
  sb.set(`A${tot}`, 'Totales')
    .check(`L${tot}`, `=ROUND(SUM(L${first}:L${last}),2)`, Number(totals[6]), 'Total ingresos', 'moneda')
    .check(`M${tot}`, `=ROUND(SUM(M${first}:M${last}),2)`, Number(totals[7]), 'Aportes personales', 'moneda')
    .check(`P${tot}`, `=ROUND(SUM(P${first}:P${last}),2)`, Number(totals[10]), 'Total líquido', 'moneda');
  return sb.build();
}

export const rolPagos: DeliverableDefinition<RolPagosInput> = {
  id: 'rol-pagos',
  parse: (raw) => inputSchema.parse(raw),
  ejemplo: {
    empresa: 'Ferretería El Tornillo',
    periodo: 'marzo de 2026',
    trabajadores: [
      {
        nombre: 'Ana Pérez',
        cargo: 'Cajera',
        sueldo: 650,
        horasSuplementarias: 10,
        horasExtraordinarias: 0,
        comisiones: 0,
        mesesAntiguedad: 6,
        decimosMensualizados: false,
        otrosDescuentos: 0,
      },
      {
        nombre: 'Luis Torres',
        cargo: 'Vendedor',
        sueldo: 1_000,
        horasSuplementarias: 0,
        horasExtraordinarias: 0,
        comisiones: 100,
        mesesAntiguedad: 24,
        decimosMensualizados: true,
        otrosDescuentos: 0,
      },
    ],
  },
  compute,
  toSheet,
  fuentes: ['codigo-trabajo', 'iess-tasas', 'mdt-sbu-2026'],
  cifras: [
    'sbu',
    'iess-aporte-personal',
    'iess-aporte-patronal',
    'recargo-suplementarias',
    'recargo-extraordinarias',
    'fondo-reserva',
  ],
};

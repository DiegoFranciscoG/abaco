import { z } from '../zod';
import { SheetBuilder } from './sheet-builder';
import {
  DeliverableError,
  es,
  round2,
  xl,
  type DeliverableDefinition,
  type DeliverableResult,
  type OutputTable,
  type SheetExport,
  type Step,
} from './types';

/**
 * Loan amortization table. French system: equal installments; German: equal principal; American: interest only
 * and the whole principal at the end. The annual rate is nominal and is divided by the periods per year. Every
 * amount is rounded to the cent and the last installment absorbs the rounding so the balance ends at zero.
 * Source: OpenStax, Contemporary Mathematics 6.8 and Principles of Finance 2e 8.2 (same as the verified formulas
 * cuota-prestamo, interes-cuota, capital-cuota, saldo-insoluto and cuota-capital-constante).
 */
export const PERIODICIDADES = { mensual: 12, trimestral: 4, semestral: 2, anual: 1 } as const;
export type Periodicidad = keyof typeof PERIODICIDADES;
export type Sistema = 'frances' | 'aleman' | 'americano';
export const MAX_PERIODOS = 180;

const inputSchema = z.object({
  titulo: z.string().max(120).default('Tabla de amortización'),
  monto: z.number(),
  tasaAnual: z.number(),
  plazo: z.number(),
  periodicidad: z.enum(['mensual', 'trimestral', 'semestral', 'anual']),
  sistema: z.enum(['frances', 'aleman', 'americano']),
});
export type AmortizacionInput = z.infer<typeof inputSchema>;

export interface AmortizacionRow {
  periodo: number;
  cuota: number;
  interes: number;
  capital: number;
  saldo: number;
}

function validate(input: AmortizacionInput): void {
  const errores: string[] = [];
  if (!Number.isFinite(input.monto) || input.monto <= 0)
    errores.push('El monto del préstamo tiene que ser mayor que cero.');
  if (!Number.isFinite(input.tasaAnual) || input.tasaAnual < 0 || input.tasaAnual > 200) {
    errores.push('La tasa anual tiene que estar entre 0 % y 200 %.');
  }
  if (!Number.isInteger(input.plazo) || input.plazo < 1 || input.plazo > MAX_PERIODOS) {
    errores.push(`El plazo tiene que ser un número entero de 1 a ${MAX_PERIODOS} períodos.`);
  }
  if (errores.length > 0) throw new DeliverableError(errores);
}

export function amortizationRows(input: AmortizacionInput): {
  tasa: number;
  cuotaFija: number;
  filas: AmortizacionRow[];
} {
  validate(input);
  const m = PERIODICIDADES[input.periodicidad];
  const i = input.tasaAnual / 100 / m;
  const n = input.plazo;
  const cuotaFija =
    input.sistema === 'frances'
      ? round2(i === 0 ? input.monto / n : (input.monto * i) / (1 - (1 + i) ** -n))
      : input.sistema === 'aleman'
        ? round2(input.monto / n)
        : 0;
  const filas: AmortizacionRow[] = [];
  let saldo = round2(input.monto);
  for (let k = 1; k <= n; k += 1) {
    const interes = round2(saldo * i);
    const last = k === n;
    const capital = last
      ? saldo
      : input.sistema === 'frances'
        ? round2(cuotaFija - interes)
        : input.sistema === 'aleman'
          ? cuotaFija
          : 0;
    const nuevo = round2(saldo - capital);
    filas.push({ periodo: k, cuota: round2(interes + capital), interes, capital, saldo: nuevo });
    saldo = nuevo;
  }
  return { tasa: i, cuotaFija, filas };
}

const SISTEMA_LABEL: Record<Sistema, string> = {
  frances: 'francés (cuota fija)',
  aleman: 'alemán (capital constante)',
  americano: 'americano (interés periódico y capital al final)',
};

function compute(input: AmortizacionInput): DeliverableResult {
  const { tasa, cuotaFija, filas } = amortizationRows(input);
  const m = PERIODICIDADES[input.periodicidad];
  const n = input.plazo;
  const totalInteres = round2(filas.reduce((s, f) => s + f.interes, 0));
  const totalPagado = round2(filas.reduce((s, f) => s + f.cuota, 0));
  const first = filas[0]!;
  const last = filas[filas.length - 1]!;
  const pasos: Step[] = [
    {
      titulo: 'Tasa del período',
      expresion: `i = ${es(input.tasaAnual, 4)} % ÷ ${m} = ${es(tasa * 100, 6)} %`,
      calculo: `=${xl(input.tasaAnual)}/100/${m}`,
      resultado: tasa,
      formato: 'percent',
    },
  ];
  if (input.sistema === 'frances') {
    pasos.push({
      titulo: 'Cuota fija',
      expresion:
        tasa === 0
          ? `Cuota = ${es(input.monto)} ÷ ${n} = ${es(cuotaFija)}`
          : `Cuota = P × i ÷ (1 − (1 + i)^−n) = ${es(input.monto)} × ${es(tasa, 6)} ÷ (1 − ${es(1 + tasa, 6)}^−${n}) = ${es(cuotaFija)}`,
      calculo:
        tasa === 0
          ? `=ROUND(${xl(input.monto)}/${n},2)`
          : `=ROUND(${xl(input.monto)}*${xl(tasa)}/(1-(1+${xl(tasa)})^(-${n})),2)`,
      resultado: cuotaFija,
      formato: 'money',
    });
  } else if (input.sistema === 'aleman') {
    pasos.push({
      titulo: 'Capital constante de cada cuota',
      expresion: `Capital = ${es(input.monto)} ÷ ${n} = ${es(cuotaFija)}`,
      calculo: `=ROUND(${xl(input.monto)}/${n},2)`,
      resultado: cuotaFija,
      formato: 'money',
    });
  }
  pasos.push(
    {
      titulo: 'Interés del período 1',
      expresion: `Interés = saldo × i = ${es(input.monto)} × ${es(tasa, 6)} = ${es(first.interes)}`,
      calculo: `=ROUND(${xl(input.monto)}*${xl(tasa)},2)`,
      resultado: first.interes,
      formato: 'money',
    },
    {
      titulo: 'Capital del período 1',
      expresion:
        input.sistema === 'frances'
          ? `Capital = cuota − interés = ${es(cuotaFija)} − ${es(first.interes)} = ${es(first.capital)}`
          : `Capital = ${es(first.capital)}`,
      calculo:
        input.sistema === 'frances' ? `=${xl(cuotaFija)}-${xl(first.interes)}` : `=${xl(first.capital)}`,
      resultado: first.capital,
      formato: 'money',
    },
    {
      titulo: 'Cuota del período 1',
      expresion: `Cuota = interés + capital = ${es(first.interes)} + ${es(first.capital)} = ${es(first.cuota)}`,
      calculo: `=${xl(first.interes)}+${xl(first.capital)}`,
      resultado: first.cuota,
      formato: 'money',
    },
    {
      titulo: 'Saldo después del período 1',
      expresion: `Saldo = ${es(input.monto)} − ${es(first.capital)} = ${es(first.saldo)}`,
      calculo: `=${xl(round2(input.monto))}-${xl(first.capital)}`,
      resultado: first.saldo,
      formato: 'money',
    },
  );
  if (n > 1) {
    const before = filas[filas.length - 2]!.saldo;
    pasos.push({
      titulo: `Último período (${n}): se paga todo el saldo`,
      expresion: `Cuota = interés + saldo pendiente = ${es(last.interes)} + ${es(before)} = ${es(last.cuota)}`,
      calculo: `=${xl(last.interes)}+${xl(before)}`,
      resultado: last.cuota,
      formato: 'money',
    });
  }
  pasos.push(
    {
      titulo: 'Total pagado',
      expresion: `Suma de las ${n} cuotas = ${es(totalPagado)}`,
      calculo: `=${filas.map((f) => xl(f.cuota)).join('+')}`,
      resultado: totalPagado,
      formato: 'money',
    },
    {
      titulo: 'Total de intereses',
      expresion: `Intereses = total pagado − monto = ${es(totalPagado)} − ${es(input.monto)} = ${es(totalInteres)}`,
      calculo: `=${xl(totalPagado)}-${xl(round2(input.monto))}`,
      resultado: totalInteres,
      formato: 'money',
    },
  );

  const tabla: OutputTable = {
    id: 'amortizacion',
    titulo: `Tabla de amortización, sistema ${SISTEMA_LABEL[input.sistema]}`,
    columnas: [
      { titulo: 'Período', formato: 'integer' },
      { titulo: 'Cuota', formato: 'money' },
      { titulo: 'Interés', formato: 'money' },
      { titulo: 'Capital', formato: 'money' },
      { titulo: 'Saldo', formato: 'money' },
    ],
    filas: [
      [0, null, null, null, round2(input.monto)],
      ...filas.map((f) => [f.periodo, f.cuota, f.interes, f.capital, f.saldo]),
    ],
    total: ['Total', totalPagado, totalInteres, round2(input.monto), null],
  };

  const advertencias: string[] = [];
  if (last.cuota !== first.cuota && input.sistema === 'frances' && n > 1) {
    advertencias.push(
      `La última cuota (${es(last.cuota)}) difiere de la fija por el redondeo a centavos de cada período: así el saldo termina exactamente en cero.`,
    );
  }
  return {
    resumen: [
      {
        etiqueta:
          input.sistema === 'americano'
            ? 'Interés de cada período'
            : input.sistema === 'aleman'
              ? 'Primera cuota'
              : 'Cuota fija',
        valor: input.sistema === 'frances' ? cuotaFija : first.cuota,
        formato: 'money',
        destacado: true,
      },
      { etiqueta: 'Total de intereses', valor: totalInteres, formato: 'money' },
      { etiqueta: 'Total pagado', valor: totalPagado, formato: 'money' },
      { etiqueta: 'Tasa del período', valor: tasa, formato: 'percent' },
    ],
    pasos,
    tablas: [tabla],
    advertencias,
    interpretacion: [
      `Se pagan ${es(totalInteres)} de intereses por un préstamo de ${es(input.monto)}: ${es((totalInteres / input.monto) * 100, 2)} % del monto.`,
      input.sistema === 'frances'
        ? 'En el sistema francés la cuota es igual, pero al principio casi todo es interés y al final casi todo es capital.'
        : input.sistema === 'aleman'
          ? 'En el sistema alemán el capital es igual en cada cuota y la cuota baja con el tiempo, porque el interés se calcula sobre un saldo cada vez menor.'
          : 'En el sistema americano solo se pagan intereses y todo el capital se devuelve en la última cuota.',
    ],
  };
}

function toSheet(input: AmortizacionInput, result: DeliverableResult): SheetExport {
  const { filas, cuotaFija } = amortizationRows(input);
  const n = input.plazo;
  const sb = new SheetBuilder()
    .text('A1', input.titulo || 'Tabla de amortización')
    .set('A2', 'Monto')
    .set('B2', round2(input.monto), 'moneda')
    .set('A3', 'Tasa anual')
    .set('B3', input.tasaAnual / 100, 'porcentaje')
    .set('A4', 'Períodos por año')
    .set('B4', PERIODICIDADES[input.periodicidad], 'entero')
    .set('A5', 'Plazo (períodos)')
    .set('B5', n, 'entero')
    .set('A6', 'Tasa del período')
    .set('B6', '=B3/B4', 'porcentaje');
  if (input.sistema === 'frances') {
    sb.set('A7', 'Cuota fija').check(
      'B7',
      '=IF(B6=0,ROUND(B2/B5,2),ROUND(PMT(B6,B5,-B2),2))',
      cuotaFija,
      'Cuota fija',
      'moneda',
    );
  } else if (input.sistema === 'aleman') {
    sb.set('A7', 'Capital constante').check(
      'B7',
      '=ROUND(B2/B5,2)',
      cuotaFija,
      'Capital constante',
      'moneda',
    );
  }
  const header = 9;
  ['Período', 'Cuota', 'Interés', 'Capital', 'Saldo'].forEach((t, c) => sb.set(`${'ABCDE'[c]}${header}`, t));
  sb.set(`A${header + 1}`, 0, 'entero').set(`E${header + 1}`, '=B2', 'moneda');
  filas.forEach((f, idx) => {
    const r = header + 2 + idx;
    const prev = r - 1;
    const capital =
      input.sistema === 'frances'
        ? `=IF(A${r}=$B$5,E${prev},$B$7-C${r})`
        : input.sistema === 'aleman'
          ? `=IF(A${r}=$B$5,E${prev},$B$7)`
          : `=IF(A${r}=$B$5,E${prev},0)`;
    sb.set(`A${r}`, f.periodo, 'entero')
      .set(`C${r}`, `=ROUND(E${prev}*$B$6,2)`, 'moneda')
      .set(`D${r}`, capital, 'moneda')
      .set(`B${r}`, `=C${r}+D${r}`, 'moneda')
      .set(`E${r}`, `=ROUND(E${prev}-D${r},2)`, 'moneda');
  });
  const firstRow = header + 2;
  const lastRow = header + 1 + n;
  const total = lastRow + 1;
  const sumOf = (col: string) => `=ROUND(SUM(${col}${firstRow}:${col}${lastRow}),2)`;
  const totals = result.tablas[0]?.total ?? [];
  sb.set(`A${total}`, 'Total')
    .check(`B${total}`, sumOf('B'), Number(totals[1]), 'Total pagado', 'moneda')
    .check(`C${total}`, sumOf('C'), Number(totals[2]), 'Total de intereses', 'moneda')
    .check(`D${total}`, sumOf('D'), Number(totals[3]), 'Total de capital', 'moneda');
  sb.check(`E${lastRow}`, `=ROUND(E${lastRow - 1}-D${lastRow},2)`, 0, 'Saldo final', 'moneda');
  sb.check(`B${firstRow}`, `=C${firstRow}+D${firstRow}`, filas[0]!.cuota, 'Primera cuota', 'moneda');
  return sb.build();
}

export const amortizacion: DeliverableDefinition<AmortizacionInput> = {
  id: 'amortizacion',
  parse: (raw) => {
    const input = inputSchema.parse(raw);
    return { ...input, monto: round2(input.monto) };
  },
  ejemplo: {
    titulo: 'Préstamo de consumo',
    monto: 10_000,
    tasaAnual: 15,
    plazo: 12,
    periodicidad: 'mensual',
    sistema: 'frances',
  },
  compute,
  toSheet,
  fuentes: ['os-cmath', 'os-pfin2'],
  cifras: [],
};

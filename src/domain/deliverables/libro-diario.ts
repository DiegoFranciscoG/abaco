import { z } from '../zod';
import { ACCOUNT_KINDS, type Asiento } from '../../data/types';
import { checkEntry, postToLedger, trialBalance } from '../tools/journal';
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
 * General journal with automatic posting to the ledger and a trial balance (sums and balances). Each entry must
 * balance before anything is computed. Source: OpenStax, Principles of Accounting vol. 1, ch. 3 and 4 (same as the
 * verified formulas comprobacion-partida-doble and saldo-cuenta-deudora).
 */
export const MAX_ASIENTOS = 40;
export const MAX_LINEAS = 120;

const inputSchema = z.object({
  empresa: z.string().max(120).default('Empresa'),
  asientos: z
    .array(
      z.object({
        fecha: z.string().max(20).default(''),
        concepto: z.string().max(120).default(''),
        lineas: z
          .array(
            z.object({
              cuenta: z.string().max(60),
              tipo: z.enum(ACCOUNT_KINDS),
              debe: z.number().default(0),
              haber: z.number().default(0),
            }),
          )
          .max(20),
      }),
    )
    .max(MAX_ASIENTOS),
});
export type LibroDiarioInput = z.infer<typeof inputSchema>;

function asAsientos(input: LibroDiarioInput): Asiento[] {
  return input.asientos.map((a, i) => ({
    id: String(i + 1),
    fecha: a.fecha,
    glosa: a.concepto,
    lineas: a.lineas.map((l) => ({
      cuenta: l.cuenta,
      tipo: l.tipo,
      debe: round2(l.debe),
      haber: round2(l.haber),
    })),
  }));
}

export function runJournal(input: LibroDiarioInput) {
  const errores: string[] = [];
  if (input.asientos.length === 0) errores.push('Agrega al menos un asiento.');
  const lineCount = input.asientos.reduce((n, a) => n + a.lineas.length, 0);
  if (lineCount > MAX_LINEAS) errores.push(`El libro admite hasta ${MAX_LINEAS} líneas en total.`);
  const asientos = asAsientos(input);
  asientos.forEach((a, i) => {
    if (a.lineas.some((l) => !l.cuenta.trim()))
      errores.push(`Asiento ${i + 1}: cada línea necesita el nombre de la cuenta.`);
    const check = checkEntry(a.lineas);
    for (const e of check.errores) errores.push(`Asiento ${i + 1}: ${e}`);
  });
  if (errores.length > 0) throw new DeliverableError(errores);
  const ledger = postToLedger(asientos);
  const balance = trialBalance(ledger);
  const totalDebe = round2(asientos.reduce((s, a) => s + a.lineas.reduce((t, l) => t + l.debe, 0), 0));
  const totalHaber = round2(asientos.reduce((s, a) => s + a.lineas.reduce((t, l) => t + l.haber, 0), 0));
  return { asientos, ledger, balance, totalDebe, totalHaber };
}

function compute(input: LibroDiarioInput): DeliverableResult {
  const { asientos, ledger, balance, totalDebe, totalHaber } = runJournal(input);
  const allDebe = asientos.flatMap((a) => a.lineas.filter((l) => l.debe > 0).map((l) => l.debe));
  const allHaber = asientos.flatMap((a) => a.lineas.filter((l) => l.haber > 0).map((l) => l.haber));
  const pasos: Step[] = [
    {
      titulo: 'Total del debe del libro diario',
      expresion: `${allDebe.map((v) => es(v)).join(' + ')} = ${es(totalDebe)}`,
      calculo: `=${allDebe.map(xl).join('+') || '0'}`,
      resultado: totalDebe,
      formato: 'money',
    },
    {
      titulo: 'Total del haber del libro diario',
      expresion: `${allHaber.map((v) => es(v)).join(' + ')} = ${es(totalHaber)}`,
      calculo: `=${allHaber.map(xl).join('+') || '0'}`,
      resultado: totalHaber,
      formato: 'money',
    },
    {
      titulo: 'Partida doble',
      expresion: `Debe − haber = ${es(totalDebe)} − ${es(totalHaber)} = ${es(round2(totalDebe - totalHaber))}`,
      calculo: `=${xl(totalDebe)}-${xl(totalHaber)}`,
      resultado: round2(totalDebe - totalHaber),
      formato: 'money',
    },
  ];
  for (const acc of ledger.slice(0, 12)) {
    const debes = acc.debe.map((d) => d.valor);
    const haberes = acc.haber.map((d) => d.valor);
    const diff = round2(acc.totalDebe - acc.totalHaber);
    pasos.push({
      titulo: `Saldo de «${acc.cuenta}»`,
      expresion: `Debe ${es(acc.totalDebe)} − haber ${es(acc.totalHaber)} = ${es(diff)} (${diff >= 0 ? 'deudor' : 'acreedor'})`,
      calculo: `=(${debes.map(xl).join('+') || '0'})-(${haberes.map(xl).join('+') || '0'})`,
      resultado: diff,
      formato: 'money',
    });
  }
  pasos.push(
    {
      titulo: 'Total de saldos deudores del balance',
      expresion: `${balance.filas
        .filter((f) => f.deudor > 0)
        .map((f) => es(f.deudor))
        .join(' + ')} = ${es(balance.totalDeudor)}`,
      calculo: `=${
        balance.filas
          .filter((f) => f.deudor > 0)
          .map((f) => xl(f.deudor))
          .join('+') || '0'
      }`,
      resultado: balance.totalDeudor,
      formato: 'money',
    },
    {
      titulo: 'Total de saldos acreedores del balance',
      expresion: `${balance.filas
        .filter((f) => f.acreedor > 0)
        .map((f) => es(f.acreedor))
        .join(' + ')} = ${es(balance.totalAcreedor)}`,
      calculo: `=${
        balance.filas
          .filter((f) => f.acreedor > 0)
          .map((f) => xl(f.acreedor))
          .join('+') || '0'
      }`,
      resultado: balance.totalAcreedor,
      formato: 'money',
    },
  );
  const advertencias: string[] = [];
  if (ledger.length > 12)
    advertencias.push(
      `El procedimiento muestra el saldo de las primeras 12 cuentas; las ${ledger.length} están en el mayor y en el balance.`,
    );
  const unusual = ledger.filter((a) => a.saldo < 0);
  for (const a of unusual) {
    advertencias.push(
      `«${a.cuenta}» quedó con saldo contrario a su naturaleza (${a.tipo}): revisa si el asiento está bien registrado.`,
    );
  }
  return {
    resumen: [
      { etiqueta: 'Total del debe', valor: totalDebe, formato: 'money', destacado: true },
      { etiqueta: 'Total del haber', valor: totalHaber, formato: 'money' },
      { etiqueta: 'Cuentas en el mayor', valor: ledger.length, formato: 'integer' },
      {
        etiqueta: 'Balance de comprobación',
        valor: balance.cuadra ? 'Cuadra' : 'No cuadra',
        formato: 'text',
      },
    ],
    pasos,
    tablas: [
      {
        id: 'diario',
        titulo: `Libro diario · ${input.empresa || 'Empresa'}`,
        columnas: [
          { titulo: 'N.º', formato: 'integer' },
          { titulo: 'Fecha', formato: 'text' },
          { titulo: 'Cuenta y concepto', formato: 'text' },
          { titulo: 'Debe', formato: 'money' },
          { titulo: 'Haber', formato: 'money' },
        ],
        filas: asientos.flatMap((a, i) => [
          ...a.lineas.map((l, j) => [
            j === 0 ? i + 1 : null,
            j === 0 ? a.fecha : '',
            l.haber > 0 ? `      ${l.cuenta}` : l.cuenta,
            l.debe || null,
            l.haber || null,
          ]),
          ...(a.glosa ? [[null, '', `P/R ${a.glosa}`, null, null]] : []),
        ]),
        total: [null, '', 'Totales', totalDebe, totalHaber],
      },
      {
        id: 'mayor',
        titulo: 'Libro mayor (resumen por cuenta)',
        columnas: [
          { titulo: 'Cuenta', formato: 'text' },
          { titulo: 'Tipo', formato: 'text' },
          { titulo: 'Debe', formato: 'money' },
          { titulo: 'Haber', formato: 'money' },
          { titulo: 'Saldo', formato: 'money' },
        ],
        filas: ledger.map((a) => [a.cuenta, a.tipo, a.totalDebe, a.totalHaber, a.saldo]),
      },
      {
        id: 'balance',
        titulo: 'Balance de comprobación',
        columnas: [
          { titulo: 'Cuenta', formato: 'text' },
          { titulo: 'Suma debe', formato: 'money' },
          { titulo: 'Suma haber', formato: 'money' },
          { titulo: 'Saldo deudor', formato: 'money' },
          { titulo: 'Saldo acreedor', formato: 'money' },
        ],
        filas: ledger.map((a, i) => [
          a.cuenta,
          a.totalDebe,
          a.totalHaber,
          balance.filas[i]!.deudor || null,
          balance.filas[i]!.acreedor || null,
        ]),
        total: ['Totales', totalDebe, totalHaber, balance.totalDeudor, balance.totalAcreedor],
      },
    ],
    advertencias,
    interpretacion: [
      `Cada asiento cumple la partida doble y el libro suma ${es(totalDebe)} en el debe y en el haber.`,
      balance.cuadra
        ? `El balance de comprobación cuadra: saldos deudores y acreedores suman ${es(balance.totalDeudor)}.`
        : 'El balance de comprobación no cuadra: revisa los saldos.',
    ],
  };
}

function toSheet(input: LibroDiarioInput, result: DeliverableResult): SheetExport {
  const { asientos, ledger, balance, totalDebe, totalHaber } = runJournal(input);
  const sb = new SheetBuilder().text('A1', `Libro diario · ${input.empresa || 'Empresa'}`);
  ['N.º', 'Fecha', 'Cuenta', 'Debe', 'Haber'].forEach((t, c) => sb.set(`${'ABCDE'[c]}3`, t));
  let r = 4;
  asientos.forEach((a, i) => {
    a.lineas.forEach((l, j) => {
      if (j === 0) sb.set(`A${r}`, i + 1, 'entero').text(`B${r}`, a.fecha);
      sb.text(`C${r}`, l.cuenta);
      if (l.debe > 0) sb.set(`D${r}`, l.debe, 'moneda');
      if (l.haber > 0) sb.set(`E${r}`, l.haber, 'moneda');
      r += 1;
    });
  });
  const last = r - 1;
  sb.set(`C${r}`, 'Totales')
    .check(`D${r}`, `=ROUND(SUM(D4:D${last}),2)`, totalDebe, 'Total del debe', 'moneda')
    .check(`E${r}`, `=ROUND(SUM(E4:E${last}),2)`, totalHaber, 'Total del haber', 'moneda');
  // Trial balance next to the journal: each account is summed from the journal with SUMIF (live posting).
  ['Cuenta', 'Suma debe', 'Suma haber', 'Saldo deudor', 'Saldo acreedor'].forEach((t, c) =>
    sb.set(`${'GHIJK'[c]}3`, t),
  );
  ledger.forEach((acc, i) => {
    const row = 4 + i;
    sb.text(`G${row}`, acc.cuenta)
      .set(`H${row}`, `=ROUND(SUMIF($C$4:$C$${last},G${row},$D$4:$D$${last}),2)`, 'moneda')
      .set(`I${row}`, `=ROUND(SUMIF($C$4:$C$${last},G${row},$E$4:$E$${last}),2)`, 'moneda')
      .check(
        `J${row}`,
        `=IF(H${row}>I${row},ROUND(H${row}-I${row},2),0)`,
        balance.filas[i]!.deudor,
        `Saldo deudor de ${acc.cuenta}`,
        'moneda',
      )
      .check(
        `K${row}`,
        `=IF(I${row}>H${row},ROUND(I${row}-H${row},2),0)`,
        balance.filas[i]!.acreedor,
        `Saldo acreedor de ${acc.cuenta}`,
        'moneda',
      );
  });
  const tb = 4 + ledger.length;
  sb.set(`G${tb}`, 'Totales')
    .check(`J${tb}`, `=ROUND(SUM(J4:J${tb - 1}),2)`, balance.totalDeudor, 'Total deudor', 'moneda')
    .check(`K${tb}`, `=ROUND(SUM(K4:K${tb - 1}),2)`, balance.totalAcreedor, 'Total acreedor', 'moneda');
  void result;
  return sb.build();
}

export const libroDiario: DeliverableDefinition<LibroDiarioInput> = {
  id: 'libro-diario',
  parse: (raw) => inputSchema.parse(raw),
  ejemplo: {
    empresa: 'Papelería La Esquina',
    asientos: [
      {
        fecha: '01/03',
        concepto: 'Aporte inicial de la dueña',
        lineas: [
          { cuenta: 'Caja', tipo: 'activo', debe: 5_000, haber: 0 },
          { cuenta: 'Capital', tipo: 'patrimonio', debe: 0, haber: 5_000 },
        ],
      },
      {
        fecha: '05/03',
        concepto: 'Compra de mercadería a crédito',
        lineas: [
          { cuenta: 'Mercaderías', tipo: 'activo', debe: 1_800, haber: 0 },
          { cuenta: 'Proveedores', tipo: 'pasivo', debe: 0, haber: 1_800 },
        ],
      },
      {
        fecha: '09/03',
        concepto: 'Venta al contado',
        lineas: [
          { cuenta: 'Caja', tipo: 'activo', debe: 950, haber: 0 },
          { cuenta: 'Ventas', tipo: 'ingreso', debe: 0, haber: 950 },
        ],
      },
    ],
  },
  compute,
  toSheet,
  fuentes: ['os-pfa'],
  cifras: [],
};

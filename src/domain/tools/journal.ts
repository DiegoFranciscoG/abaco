/**
 * Journal, ledger and trial balance for the "Libro diario y mayor" tool. Double-entry rules as in OpenStax
 * Principles of Financial Accounting, ch. 3 (Analyzing and Recording Transactions): every entry has equal debits
 * and credits; assets and expenses increase with debits; liabilities, equity and revenue increase with credits.
 */
import type { AccountKind, Asiento, LineaAsiento } from '../../data/types';

export const NORMAL_SIDE: Record<AccountKind, 'debe' | 'haber'> = {
  activo: 'debe',
  gasto: 'debe',
  pasivo: 'haber',
  patrimonio: 'haber',
  ingreso: 'haber',
};

export const KIND_LABEL: Record<AccountKind, string> = {
  activo: 'Activo',
  pasivo: 'Pasivo',
  patrimonio: 'Patrimonio',
  ingreso: 'Ingreso',
  gasto: 'Gasto',
};

const cents = (value: number): number => Math.round(value * 100);
const fromCents = (value: number): number => value / 100;

export interface EntryCheck {
  ok: boolean;
  totalDebe: number;
  totalHaber: number;
  errores: string[];
}

/** Validates one journal entry before saving it. Works in cents to avoid floating point surprises. */
export function checkEntry(lineas: readonly LineaAsiento[]): EntryCheck {
  const errores: string[] = [];
  if (lineas.length < 2) errores.push('Un asiento necesita al menos dos líneas.');
  let debe = 0;
  let haber = 0;
  lineas.forEach((l, i) => {
    const n = i + 1;
    if (!l.cuenta.trim()) errores.push(`Línea ${n}: escribe el nombre de la cuenta.`);
    if (!Number.isFinite(l.debe) || !Number.isFinite(l.haber) || l.debe < 0 || l.haber < 0) {
      errores.push(`Línea ${n}: los valores deben ser números positivos.`);
      return;
    }
    if (l.debe > 0 && l.haber > 0) errores.push(`Línea ${n}: una línea va al debe o al haber, no a los dos.`);
    if (l.debe === 0 && l.haber === 0) errores.push(`Línea ${n}: falta el valor.`);
    debe += cents(l.debe);
    haber += cents(l.haber);
  });
  if (debe !== haber) {
    errores.push(
      `No cuadra: el debe suma ${fromCents(debe).toFixed(2)} y el haber ${fromCents(haber).toFixed(2)}. La partida doble exige que sean iguales.`,
    );
  }
  return { ok: errores.length === 0, totalDebe: fromCents(debe), totalHaber: fromCents(haber), errores };
}

export interface LedgerAccount {
  cuenta: string;
  tipo: AccountKind;
  debe: { fecha: string; valor: number; asiento: number }[];
  haber: { fecha: string; valor: number; asiento: number }[];
  totalDebe: number;
  totalHaber: number;
  /** Positive balance on the account's normal side; negative means an unusual balance. */
  saldo: number;
  ladoSaldo: 'debe' | 'haber';
}

const accountKey = (name: string): string => name.trim().toLocaleLowerCase('es');

/** Posts every entry to its T accounts ("mayorización"). Accounts keep the first spelling and type used. */
export function postToLedger(asientos: readonly Asiento[]): LedgerAccount[] {
  const accounts = new Map<string, LedgerAccount & { debeC: number; haberC: number }>();
  asientos.forEach((a, index) => {
    for (const l of a.lineas) {
      const key = accountKey(l.cuenta);
      let acc = accounts.get(key);
      if (!acc) {
        acc = {
          cuenta: l.cuenta.trim(),
          tipo: l.tipo,
          debe: [],
          haber: [],
          totalDebe: 0,
          totalHaber: 0,
          saldo: 0,
          ladoSaldo: NORMAL_SIDE[l.tipo],
          debeC: 0,
          haberC: 0,
        };
        accounts.set(key, acc);
      }
      if (l.debe > 0) {
        acc.debe.push({ fecha: a.fecha, valor: l.debe, asiento: index + 1 });
        acc.debeC += cents(l.debe);
      }
      if (l.haber > 0) {
        acc.haber.push({ fecha: a.fecha, valor: l.haber, asiento: index + 1 });
        acc.haberC += cents(l.haber);
      }
    }
  });
  return [...accounts.values()].map(({ debeC, haberC, ...acc }) => {
    const normal = NORMAL_SIDE[acc.tipo];
    const saldoC = normal === 'debe' ? debeC - haberC : haberC - debeC;
    return {
      ...acc,
      totalDebe: fromCents(debeC),
      totalHaber: fromCents(haberC),
      saldo: fromCents(saldoC),
      ladoSaldo: normal,
    };
  });
}

export interface TrialBalance {
  filas: { cuenta: string; tipo: AccountKind; deudor: number; acreedor: number }[];
  totalDeudor: number;
  totalAcreedor: number;
  cuadra: boolean;
}

/** Trial balance with balances: each account shows its balance in the debit or credit column. */
export function trialBalance(ledger: readonly LedgerAccount[]): TrialBalance {
  let deudor = 0;
  let acreedor = 0;
  const filas = ledger.map((acc) => {
    const diff = cents(acc.totalDebe) - cents(acc.totalHaber);
    const fila = {
      cuenta: acc.cuenta,
      tipo: acc.tipo,
      deudor: diff > 0 ? fromCents(diff) : 0,
      acreedor: diff < 0 ? fromCents(-diff) : 0,
    };
    deudor += Math.max(diff, 0);
    acreedor += Math.max(-diff, 0);
    return fila;
  });
  return {
    filas,
    totalDeudor: fromCents(deudor),
    totalAcreedor: fromCents(acreedor),
    cuadra: deudor === acreedor,
  };
}

export interface Statements {
  ingresos: number;
  gastos: number;
  utilidad: number;
  activo: number;
  pasivo: number;
  patrimonio: number;
  /** Activo − (pasivo + patrimonio + utilidad): zero when the books are balanced. */
  diferencia: number;
}

/** Simple income statement and balance sheet from the ledger (before closing entries). */
export function statements(ledger: readonly LedgerAccount[]): Statements {
  const sum = (kind: AccountKind) =>
    ledger.filter((a) => a.tipo === kind).reduce((s, a) => s + cents(a.saldo), 0);
  const ingresos = sum('ingreso');
  const gastos = sum('gasto');
  const activo = sum('activo');
  const pasivo = sum('pasivo');
  const patrimonio = sum('patrimonio');
  const utilidad = ingresos - gastos;
  return {
    ingresos: fromCents(ingresos),
    gastos: fromCents(gastos),
    utilidad: fromCents(utilidad),
    activo: fromCents(activo),
    pasivo: fromCents(pasivo),
    patrimonio: fromCents(patrimonio),
    diferencia: fromCents(activo - (pasivo + patrimonio + utilidad)),
  };
}

/** Common accounts for the first exercises (names as used in Ecuadorian classrooms; the student can type any). */
export const SUGGESTED_ACCOUNTS: { cuenta: string; tipo: AccountKind }[] = [
  { cuenta: 'Caja', tipo: 'activo' },
  { cuenta: 'Bancos', tipo: 'activo' },
  { cuenta: 'Cuentas por cobrar', tipo: 'activo' },
  { cuenta: 'Inventario de mercaderías', tipo: 'activo' },
  { cuenta: 'IVA en compras', tipo: 'activo' },
  { cuenta: 'Muebles y enseres', tipo: 'activo' },
  { cuenta: 'Equipo de computación', tipo: 'activo' },
  { cuenta: 'Cuentas por pagar', tipo: 'pasivo' },
  { cuenta: 'IVA en ventas', tipo: 'pasivo' },
  { cuenta: 'Préstamos bancarios', tipo: 'pasivo' },
  { cuenta: 'Capital', tipo: 'patrimonio' },
  { cuenta: 'Ventas', tipo: 'ingreso' },
  { cuenta: 'Costo de ventas', tipo: 'gasto' },
  { cuenta: 'Sueldos', tipo: 'gasto' },
  { cuenta: 'Arriendo', tipo: 'gasto' },
  { cuenta: 'Servicios básicos', tipo: 'gasto' },
];

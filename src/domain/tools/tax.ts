import { cifraValor, requireCifra } from '../content/normativa';

/**
 * Ecuadorian tax calculations used by the "IVA e impuesto a la renta" tool. Every rate and table comes from
 * content/normativa.json, where each one carries its legal basis, official source and validity:
 * - Income tax table of the fiscal year (SRI resolution published every December).
 * - RIMPE tables and limits (SRI, "Régimen Simplificado para Emprendedores y Negocios Populares").
 * - IVA general rate, kept as an input because it can change by decree.
 */

export interface IncomeBracket {
  desde: number;
  hasta: number | null;
  impuestoFraccion: number;
  porcentaje: number;
}

function brackets(id: string): IncomeBracket[] {
  const { tramos } = requireCifra(id);
  if (!tramos) throw new Error(`La cifra «${id}» no es una tabla de tramos`);
  return tramos.map((t) => ({
    desde: t.desde,
    hasta: t.hasta,
    impuestoFraccion: t.impuesto_fraccion,
    porcentaje: t.porcentaje / 100,
  }));
}

/** Income tax table of individuals for the fiscal year in force. */
export const IR_PERSONAS: readonly IncomeBracket[] = brackets('ir-personas-tabla');
export const IR_PERSONAS_EJERCICIO = requireCifra('ir-personas-tabla').vigencia.ejercicio_fiscal;

export const IR_SOCIEDADES_TARIFA = cifraValor('ir-sociedades') / 100;

export const RIMPE_POPULARES: readonly { desde: number; hasta: number; cuota: number }[] =
  requireCifra('rimpe-negocios-populares').cuotas ?? [];

export const RIMPE_EMPRENDEDORES: readonly IncomeBracket[] = brackets('rimpe-emprendedores');

/** Gross income limit of the RIMPE (entrepreneurs) and of popular businesses (last row of their table). */
export const RIMPE_LIMITE = cifraValor('rimpe-limites');
export const RIMPE_LIMITE_POPULARES = RIMPE_POPULARES[RIMPE_POPULARES.length - 1]?.hasta ?? 0;

export const IVA_TARIFA_GENERAL = cifraValor('iva-tarifa-general') / 100;

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

function assertAmount(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0)
    throw new RangeError(`${label} debe ser un número mayor o igual a cero.`);
}

export interface IvaResult {
  base: number;
  iva: number;
  total: number;
}

/** IVA charged on a sale whose price before tax is `base`. */
export function ivaFromBase(base: number, tarifa = IVA_TARIFA_GENERAL): IvaResult {
  assertAmount(base, 'La base');
  assertAmount(tarifa, 'La tarifa');
  const iva = round2(base * tarifa);
  return { base: round2(base), iva, total: round2(base + iva) };
}

/** Splits a final price that already includes IVA into base and tax. */
export function ivaFromTotal(total: number, tarifa = IVA_TARIFA_GENERAL): IvaResult {
  assertAmount(total, 'El precio final');
  assertAmount(tarifa, 'La tarifa');
  const base = round2(total / (1 + tarifa));
  return { base, iva: round2(total - base), total: round2(total) };
}

export interface BracketResult {
  impuesto: number;
  tramo: IncomeBracket;
  excedente: number;
}

function applyBrackets(base: number, table: readonly IncomeBracket[]): BracketResult {
  const tramo = [...table].reverse().find((b) => base >= b.desde) ?? table[0];
  if (!tramo) throw new RangeError('Tabla vacía.');
  const excedente = Math.max(0, base - tramo.desde);
  return {
    impuesto: round2(tramo.impuestoFraccion + excedente * tramo.porcentaje),
    tramo,
    excedente: round2(excedente),
  };
}

/** Income tax of individuals with the table in force (before the personal expenses rebate). */
export function incomeTaxPersonas(
  baseImponible: number,
  table: readonly IncomeBracket[] = IR_PERSONAS,
): BracketResult {
  assertAmount(baseImponible, 'La base imponible');
  return applyBrackets(baseImponible, table);
}

export function incomeTaxSociedades(baseImponible: number, tarifa = IR_SOCIEDADES_TARIFA): number {
  assertAmount(baseImponible, 'La base imponible');
  return round2(baseImponible * tarifa);
}

export type RimpeResult =
  | { regimen: 'negocio-popular'; impuesto: number }
  | { regimen: 'emprendedor'; impuesto: number; tramo: IncomeBracket }
  | { regimen: 'fuera'; impuesto: null }
  | { regimen: 'sin-tramo'; impuesto: null };

/**
 * RIMPE income tax from gross income. Popular businesses (up to USD 20 000, natural persons) pay a fixed fee;
 * entrepreneurs pay a basic amount plus a marginal rate on gross income above the bracket floor. A popular
 * business above USD 20 000 uses the entrepreneurs' table, as the SRI page states. The published entrepreneurs'
 * table starts at USD 20 000, so an entrepreneur below that amount gets "sin-tramo" instead of a guess.
 */
export function rimpeTax(ingresosBrutos: number, esNegocioPopular: boolean): RimpeResult {
  assertAmount(ingresosBrutos, 'Los ingresos brutos');
  if (ingresosBrutos > RIMPE_LIMITE) return { regimen: 'fuera', impuesto: null };
  if (esNegocioPopular && ingresosBrutos <= RIMPE_LIMITE_POPULARES) {
    const tramo =
      RIMPE_POPULARES.find((b) => ingresosBrutos <= b.hasta) ?? RIMPE_POPULARES[RIMPE_POPULARES.length - 1];
    return { regimen: 'negocio-popular', impuesto: tramo?.cuota ?? 0 };
  }
  if (ingresosBrutos < (RIMPE_EMPRENDEDORES[0]?.desde ?? 0)) return { regimen: 'sin-tramo', impuesto: null };
  const { impuesto, tramo } = applyBrackets(ingresosBrutos, RIMPE_EMPRENDEDORES);
  return { regimen: 'emprendedor', impuesto, tramo };
}

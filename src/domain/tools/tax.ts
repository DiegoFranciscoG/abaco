/**
 * Ecuadorian tax calculations used by the "IVA e impuesto a la renta" tool.
 * Sources (verified 2026-10-25, see docs/investigacion.md):
 * - Income tax table 2026: SRI, Res. NAC-DGERCGC25-00000043 (2.º Supl. R.O. 194, 30-12-2025).
 * - RIMPE tables: SRI, "Régimen Simplificado para Emprendedores y Negocios Populares".
 * - IVA: general rate 15 % since 01-04-2024 (Decreto Ejecutivo 198); kept as an input because it can change by decree.
 */

export interface IncomeBracket {
  desde: number;
  hasta: number | null;
  impuestoFraccion: number;
  porcentaje: number;
}

export const IR_PERSONAS_2026: readonly IncomeBracket[] = [
  { desde: 0, hasta: 12_208, impuestoFraccion: 0, porcentaje: 0 },
  { desde: 12_208, hasta: 15_549, impuestoFraccion: 0, porcentaje: 0.05 },
  { desde: 15_549, hasta: 20_188, impuestoFraccion: 167, porcentaje: 0.1 },
  { desde: 20_188, hasta: 26_700, impuestoFraccion: 631, porcentaje: 0.12 },
  { desde: 26_700, hasta: 35_136, impuestoFraccion: 1_412, porcentaje: 0.15 },
  { desde: 35_136, hasta: 46_575, impuestoFraccion: 2_678, porcentaje: 0.2 },
  { desde: 46_575, hasta: 62_005, impuestoFraccion: 4_965, porcentaje: 0.25 },
  { desde: 62_005, hasta: 82_679, impuestoFraccion: 8_823, porcentaje: 0.3 },
  { desde: 82_679, hasta: 109_956, impuestoFraccion: 15_025, porcentaje: 0.35 },
  { desde: 109_956, hasta: null, impuestoFraccion: 24_572, porcentaje: 0.37 },
];

export const IR_SOCIEDADES_TARIFA = 0.25;

export const RIMPE_POPULARES: readonly { desde: number; hasta: number; cuota: number }[] = [
  { desde: 0, hasta: 2_500, cuota: 0 },
  { desde: 2_500, hasta: 5_000, cuota: 5 },
  { desde: 5_000, hasta: 10_000, cuota: 15 },
  { desde: 10_000, hasta: 15_000, cuota: 35 },
  { desde: 15_000, hasta: 20_000, cuota: 60 },
];

export const RIMPE_EMPRENDEDORES: readonly IncomeBracket[] = [
  { desde: 20_000, hasta: 50_000, impuestoFraccion: 60, porcentaje: 0.01 },
  { desde: 50_000, hasta: 75_000, impuestoFraccion: 360, porcentaje: 0.0125 },
  { desde: 75_000, hasta: 100_000, impuestoFraccion: 672.5, porcentaje: 0.015 },
  { desde: 100_000, hasta: 200_000, impuestoFraccion: 1_047.5, porcentaje: 0.0175 },
  { desde: 200_000, hasta: 300_000, impuestoFraccion: 2_797.52, porcentaje: 0.02 },
];

export const IVA_TARIFA_GENERAL = 0.15;

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

/** Income tax of individuals with the 2026 table (before the personal expenses rebate). */
export function incomeTaxPersonas(
  baseImponible: number,
  table: readonly IncomeBracket[] = IR_PERSONAS_2026,
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
  if (ingresosBrutos > 300_000) return { regimen: 'fuera', impuesto: null };
  if (esNegocioPopular && ingresosBrutos <= 20_000) {
    const tramo =
      RIMPE_POPULARES.find((b) => ingresosBrutos <= b.hasta) ?? RIMPE_POPULARES[RIMPE_POPULARES.length - 1];
    return { regimen: 'negocio-popular', impuesto: tramo?.cuota ?? 0 };
  }
  if (ingresosBrutos < 20_000) return { regimen: 'sin-tramo', impuesto: null };
  const { impuesto, tramo } = applyBrackets(ingresosBrutos, RIMPE_EMPRENDEDORES);
  return { regimen: 'emprendedor', impuesto, tramo };
}

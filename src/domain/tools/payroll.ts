import { cifraValor, percentLabel } from '../content/normativa';

/**
 * Monthly payslip ("rol de pagos") for a private-sector worker in Ecuador. Educational: every line carries its legal
 * basis, and anything that is not a fixed rule of the law is an input the student can change.
 *
 * Rates and the SBU come from content/normativa.json (verified, with validity dates; see docs/revision-anual.md):
 * - IESS official table: personal and employer contribution (private sector, dependent work).
 * - Código del Trabajo: art. 55 (overtime surcharges), art. 111 and 112 (13th salary, excluded from the IESS base),
 *   art. 113 (14th salary = one twelfth of the SBU), art. 196 (reserve fund after the first year).
 */
const IESS_PERSONAL_PCT = cifraValor('iess-aporte-personal');
const IESS_PATRONAL_PCT = cifraValor('iess-aporte-patronal');
const RECARGO_SUPLEMENTARIAS_PCT = cifraValor('recargo-suplementarias');
const RECARGO_EXTRAORDINARIAS_PCT = cifraValor('recargo-extraordinarias');
const FONDO_RESERVA_PCT = cifraValor('fondo-reserva');
export const IESS_PERSONAL = IESS_PERSONAL_PCT / 100;
export const IESS_PATRONAL = IESS_PATRONAL_PCT / 100;
/** SBU of the fiscal year in force in content/normativa.json. */
export const SBU_VIGENTE = cifraValor('sbu');
/** Usual divisor (30 days × 8 hours). The Labour Code sets it expressly only for public-sector collective contracts. */
export const HORAS_MES_HABITUAL = 240;

export interface PayrollInput {
  sueldo: number;
  /** Hours paid with the daytime surcharge (until 24:00). */
  horasSuplementarias: number;
  /** Hours paid with the night surcharge (between 24:00 and 06:00). */
  horasNocturnas: number;
  comisiones: number;
  /** Months worked with the same employer before this month. */
  mesesAntiguedad: number;
  /** The worker asked to receive the 13th and 14th salaries every month (arts. 111 and 113). */
  decimosMensualizados: boolean;
  sbu: number;
  horasMes: number;
  /** Extra employer contributions the student wants to include (0 by default; see docs). */
  otrasPatronales: number;
}

export interface PayrollLine {
  concepto: string;
  valor: number;
  base: string;
}

export interface PayrollResult {
  ingresos: PayrollLine[];
  descuentos: PayrollLine[];
  costosEmpleador: PayrollLine[];
  totalIngresos: number;
  totalDescuentos: number;
  netoAPagar: number;
  costoTotalEmpleador: number;
  /** Earnings subject to IESS contributions (excludes 13th and 14th salaries and the reserve fund). */
  materiaGravadaIess: number;
  advertencias: string[];
}

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

function nonNegative(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0)
    throw new RangeError(`${label} debe ser un número mayor o igual a cero.`);
  return value;
}

export const DEFAULT_PAYROLL: PayrollInput = {
  sueldo: 600,
  horasSuplementarias: 0,
  horasNocturnas: 0,
  comisiones: 0,
  mesesAntiguedad: 0,
  decimosMensualizados: false,
  sbu: SBU_VIGENTE,
  horasMes: HORAS_MES_HABITUAL,
  otrasPatronales: 0,
};

export function computePayroll(input: PayrollInput): PayrollResult {
  const sueldo = nonNegative(input.sueldo, 'El sueldo');
  const sbu = nonNegative(input.sbu, 'El salario básico');
  const horasMes = nonNegative(input.horasMes, 'Las horas del mes');
  if (horasMes === 0) throw new RangeError('Las horas del mes deben ser mayores que cero.');
  const suplementarias = nonNegative(input.horasSuplementarias, 'Las horas suplementarias');
  const nocturnas = nonNegative(input.horasNocturnas, 'Las horas nocturnas');
  const comisiones = nonNegative(input.comisiones, 'Las comisiones');
  const antiguedad = nonNegative(input.mesesAntiguedad, 'La antigüedad');
  const otras = nonNegative(input.otrasPatronales, 'Las otras contribuciones');

  const advertencias: string[] = [];
  if (sueldo < sbu) {
    advertencias.push(
      'El sueldo es menor que el salario básico unificado: solo es válido en jornadas parciales (art. 81, mínimos legales).',
    );
  }
  if (suplementarias > 48)
    advertencias.push(
      'El art. 55 limita las horas suplementarias a 4 por día y 12 por semana (unas 48 al mes).',
    );

  const valorHora = sueldo / horasMes;
  const pagoSuplementarias = round2(valorHora * (1 + RECARGO_SUPLEMENTARIAS_PCT / 100) * suplementarias);
  const pagoNocturnas = round2(valorHora * (1 + RECARGO_EXTRAORDINARIAS_PCT / 100) * nocturnas);
  const materiaGravadaIess = round2(sueldo + pagoSuplementarias + pagoNocturnas + comisiones);

  const ingresos: PayrollLine[] = [
    {
      concepto: 'Sueldo',
      valor: round2(sueldo),
      base: 'Contrato (art. 81: nunca menor a los mínimos legales)',
    },
  ];
  if (pagoSuplementarias > 0) {
    ingresos.push({
      concepto: `Horas suplementarias (${suplementarias} h al ${percentLabel(RECARGO_SUPLEMENTARIAS_PCT)})`,
      valor: pagoSuplementarias,
      base: 'Código del Trabajo, art. 55',
    });
  }
  if (pagoNocturnas > 0) {
    ingresos.push({
      concepto: `Horas entre 24:00 y 06:00 (${nocturnas} h al ${percentLabel(RECARGO_EXTRAORDINARIAS_PCT)})`,
      valor: pagoNocturnas,
      base: 'Código del Trabajo, art. 55',
    });
  }
  if (comisiones > 0)
    ingresos.push({ concepto: 'Comisiones', valor: round2(comisiones), base: 'Remuneración variable' });

  const decimoTercero = round2(materiaGravadaIess / 12);
  const decimoCuarto = round2(sbu / 12);
  const fondoReserva = antiguedad >= 12 ? round2(materiaGravadaIess / 12) : 0;
  if (input.decimosMensualizados) {
    ingresos.push({
      concepto: 'Décima tercera remuneración (mensual)',
      valor: decimoTercero,
      base: 'Código del Trabajo, art. 111',
    });
    ingresos.push({
      concepto: 'Décima cuarta remuneración (mensual)',
      valor: decimoCuarto,
      base: 'Código del Trabajo, art. 113',
    });
  }
  if (fondoReserva > 0) {
    ingresos.push({
      concepto: `Fondo de reserva (${percentLabel(FONDO_RESERVA_PCT)})`,
      valor: fondoReserva,
      base: 'Código del Trabajo, art. 196: desde el segundo año',
    });
  }

  const aportePersonal = round2(materiaGravadaIess * IESS_PERSONAL);
  const descuentos: PayrollLine[] = [
    {
      concepto: `Aporte personal al IESS (${percentLabel(IESS_PERSONAL_PCT)})`,
      valor: aportePersonal,
      base: 'Tabla oficial de tasas del IESS',
    },
  ];

  const aportePatronal = round2(materiaGravadaIess * IESS_PATRONAL);
  const costosEmpleador: PayrollLine[] = [
    {
      concepto: `Aporte patronal al IESS (${percentLabel(IESS_PATRONAL_PCT)})`,
      valor: aportePatronal,
      base: 'Tabla oficial de tasas del IESS',
    },
  ];
  if (otras > 0) {
    costosEmpleador.push({
      concepto: `Otras contribuciones (${otras} %)`,
      valor: round2(materiaGravadaIess * (otras / 100)),
      base: 'Valor ingresado por el estudiante',
    });
  }
  if (!input.decimosMensualizados) {
    costosEmpleador.push({
      concepto: 'Provisión décima tercera',
      valor: decimoTercero,
      base: 'Código del Trabajo, art. 111 (se paga acumulada en diciembre)',
    });
    costosEmpleador.push({
      concepto: 'Provisión décima cuarta',
      valor: decimoCuarto,
      base: 'Código del Trabajo, art. 113 (se paga acumulada en marzo o agosto)',
    });
  }

  const totalIngresos = round2(ingresos.reduce((sum, l) => sum + l.valor, 0));
  const totalDescuentos = round2(descuentos.reduce((sum, l) => sum + l.valor, 0));
  const extraEmpleador = round2(costosEmpleador.reduce((sum, l) => sum + l.valor, 0));
  return {
    ingresos,
    descuentos,
    costosEmpleador,
    totalIngresos,
    totalDescuentos,
    netoAPagar: round2(totalIngresos - totalDescuentos),
    costoTotalEmpleador: round2(totalIngresos + extraEmpleador),
    materiaGravadaIess,
    advertencias,
  };
}

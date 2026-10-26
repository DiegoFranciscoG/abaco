/**
 * Cost–volume–profit and capital budgeting used by the "Punto de equilibrio" and "Evaluador de proyectos" tools.
 * Same definitions as the verified formulas (content/formulas.json): OpenStax Principles of Managerial Accounting
 * ch. 3 and Principles of Finance ch. 16.
 */

export interface CvpInput {
  precio: number;
  costoVariable: number;
  costosFijos: number;
  ventasUnidades: number;
}

export interface CvpResult {
  margenUnitario: number;
  razonMargen: number;
  equilibrioUnidades: number;
  equilibrioDolares: number;
  utilidad: number;
  margenSeguridadUnidades: number;
  margenSeguridadPct: number;
  apalancamientoOperativo: number | null;
}

export function cvp({ precio, costoVariable, costosFijos, ventasUnidades }: CvpInput): CvpResult {
  for (const [v, label] of [
    [precio, 'El precio'],
    [costoVariable, 'El costo variable'],
    [costosFijos, 'Los costos fijos'],
    [ventasUnidades, 'Las ventas'],
  ] as const) {
    if (!Number.isFinite(v) || v < 0) throw new RangeError(`${label} debe ser un número mayor o igual a cero.`);
  }
  const margenUnitario = precio - costoVariable;
  if (margenUnitario <= 0) throw new RangeError('El precio debe ser mayor que el costo variable unitario: si no, nunca hay equilibrio.');
  const razonMargen = margenUnitario / precio;
  const equilibrioUnidades = costosFijos / margenUnitario;
  const utilidad = margenUnitario * ventasUnidades - costosFijos;
  const margenSeguridadUnidades = ventasUnidades - equilibrioUnidades;
  return {
    margenUnitario,
    razonMargen,
    equilibrioUnidades,
    equilibrioDolares: costosFijos / razonMargen,
    utilidad,
    margenSeguridadUnidades,
    margenSeguridadPct: ventasUnidades > 0 ? margenSeguridadUnidades / ventasUnidades : 0,
    apalancamientoOperativo: utilidad > 0 ? (margenUnitario * ventasUnidades) / utilidad : null,
  };
}

/** Net present value. `flujos[0]` happens today (usually the negative investment); flow t is discounted t periods. */
export function npv(tasa: number, flujos: readonly number[]): number {
  if (!Number.isFinite(tasa) || tasa <= -1) throw new RangeError('La tasa debe ser mayor que −100 %.');
  return flujos.reduce((sum, flujo, t) => sum + flujo / (1 + tasa) ** t, 0);
}

/** Number of sign changes: more than one can mean several IRRs (non-conventional flows). */
export function signChanges(flujos: readonly number[]): number {
  const signs = flujos.filter((f) => f !== 0).map(Math.sign);
  let changes = 0;
  for (let i = 1; i < signs.length; i += 1) if (signs[i] !== signs[i - 1]) changes += 1;
  return changes;
}

/**
 * Internal rate of return by bisection on [−0.99, 10]: robust and enough for teaching examples. Returns null when
 * the NPV does not change sign in the interval (no IRR to report).
 */
export function irr(flujos: readonly number[], tolerancia = 1e-12): number | null {
  if (signChanges(flujos) === 0) return null;
  let lo = -0.99;
  let hi = 10;
  let fLo = npv(lo, flujos);
  const fHi = npv(hi, flujos);
  if (Number.isNaN(fLo) || Number.isNaN(fHi) || Math.sign(fLo) === Math.sign(fHi)) return null;
  // Stop on the NPV itself (relative to the size of the flows), or when the interval cannot shrink any further.
  const scale = Math.max(1, ...flujos.map(Math.abs));
  for (let i = 0; i < 300; i += 1) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid, flujos);
    if (Math.abs(fMid) <= tolerancia * scale || mid === lo || mid === hi) return mid;
    if (Math.sign(fMid) === Math.sign(fLo)) {
      lo = mid;
      fLo = fMid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

/** Profitability index: PV of future flows ÷ initial investment (flujos[0] negative). */
export function profitabilityIndex(tasa: number, flujos: readonly number[]): number | null {
  const inversion = -(flujos[0] ?? 0);
  if (inversion <= 0) return null;
  return npv(tasa, [0, ...flujos.slice(1)]) / inversion;
}

/** Payback in periods (fractional, assuming flows spread evenly within a period). Discounted when `tasa` is given. */
export function payback(flujos: readonly number[], tasa?: number): number | null {
  let acumulado = flujos[0] ?? 0;
  if (acumulado >= 0) return 0;
  for (let t = 1; t < flujos.length; t += 1) {
    const flujo = (flujos[t] ?? 0) / (tasa === undefined ? 1 : (1 + tasa) ** t);
    if (acumulado + flujo >= 0) return t - 1 + -acumulado / flujo;
    acumulado += flujo;
  }
  return null;
}

/** NPV profile: (rate, NPV) points used to draw how the NPV falls as the rate rises. */
export function npvProfile(flujos: readonly number[], desde = 0, hasta = 0.5, pasos = 50): { tasa: number; van: number }[] {
  return Array.from({ length: pasos + 1 }, (_, i) => {
    const tasa = desde + ((hasta - desde) * i) / pasos;
    return { tasa, van: npv(tasa, flujos) };
  });
}

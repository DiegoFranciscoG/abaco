/**
 * Weighted decision matrix (generic multi-criteria scoring): each option gets a 0–10 score per criterion and the
 * criteria weights are normalized to 100 %. The SWOT board is plain structure and needs no calculation.
 */
export interface DecisionMatrix {
  criterios: { nombre: string; peso: number }[];
  opciones: string[];
  /** puntajes[opción][criterio] from 0 to 10. */
  puntajes: number[][];
}

export interface RankedOption {
  opcion: string;
  total: number;
  posicion: number;
}

export function normalizedWeights(criterios: DecisionMatrix['criterios']): number[] {
  const total = criterios.reduce((sum, c) => sum + Math.max(0, c.peso), 0);
  if (total === 0) return criterios.map(() => 0);
  return criterios.map((c) => Math.max(0, c.peso) / total);
}

export function rankOptions(matrix: DecisionMatrix): RankedOption[] {
  const weights = normalizedWeights(matrix.criterios);
  const totals = matrix.opciones.map((opcion, i) => ({
    opcion,
    total: weights.reduce((sum, w, j) => sum + w * Math.min(10, Math.max(0, matrix.puntajes[i]?.[j] ?? 0)), 0),
  }));
  const sorted = [...totals].sort((a, b) => b.total - a.total);
  return sorted.map((r) => ({ ...r, total: Math.round(r.total * 100) / 100, posicion: sorted.findIndex((s) => s.total === r.total) + 1 }));
}

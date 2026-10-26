/**
 * Deliverables: the weekly assignments of these careers (payroll, amortization table, kardex…) solved step by step.
 * Plain metadata with no runtime imports, so the search index script and the statement page can read it.
 */
export interface DeliverableInfo {
  id: string;
  nombre: string;
  descripcion: string;
  /** Subjects where it is usually assigned (ids of content/materias.json). */
  materias: string[];
}

export const DELIVERABLES: DeliverableInfo[] = [];

export function getDeliverable(id: string): DeliverableInfo | undefined {
  return DELIVERABLES.find((d) => d.id === id);
}

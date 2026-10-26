/**
 * Depth standard of a subject and how far each one is from it. Measured from the content itself, never typed by
 * hand: the coverage panel, the "4 de 6 unidades" notice, docs/cobertura.md and test T-17 all use these functions.
 * Type-only imports, so `node scripts/cobertura.ts` can load this file directly.
 *
 * Standard (ÁBACO v2 plan): 5 to 7 units (temas) per subject, 4 to 6 topics (subtemas) per unit, each with its
 * own theory and an example (enforced by the schema), and 2 numeric exercises for every topic that is calculated
 * (it has formulas). Conceptual topics are practised with the questions the study area builds from their example,
 * key points and common mistakes.
 */
import type { Carrera, Ejercicio, Materia, Temario } from './schemas';

export const ESTANDAR = {
  unidadesMin: 5,
  unidadesMax: 7,
  subtemasPorUnidadMin: 4,
  subtemasPorUnidadMax: 6,
  ejerciciosPorSubtemaDeCalculo: 2,
} as const;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export interface CoverageReport {
  materiaId: string;
  nombre: string;
  unidades: number;
  unidadesObjetivo: number;
  subtemas: number;
  subtemasCalculo: number;
  subtemasCalculoConPractica: number;
  ejercicios: number;
  cumple: boolean;
  /** What is missing to meet the standard, in words. */
  faltantes: string[];
  /** 0..1, average of units, topics and practice against the standard. */
  avance: number;
}

export function materiaCoverage(
  materia: Pick<Materia, 'id' | 'nombre'> & { cobertura?: { unidades_objetivo: number } },
  temario: Temario,
  ejercicios: readonly Pick<Ejercicio, 'materia' | 'subtema'>[],
): CoverageReport {
  const E = ESTANDAR;
  const unidadesObjetivo = materia.cobertura?.unidades_objetivo ?? 6;
  const temas = temario.temas;
  const subtemas = temas.flatMap((t) => t.subtemas);
  const calc = subtemas.filter((s) => s.formulas.length > 0);
  const practice = (id: string) => ejercicios.filter((e) => e.subtema === id).length;
  const calcOk = calc.filter((s) => practice(s.id) >= E.ejerciciosPorSubtemaDeCalculo);
  const faltantes: string[] = [];
  if (temas.length < E.unidadesMin) {
    const missing = E.unidadesMin - temas.length;
    faltantes.push(
      `${missing === 1 ? 'Falta' : 'Faltan'} ${plural(missing, 'unidad', 'unidades')}: tiene ${temas.length} y el estándar pide de ${E.unidadesMin} a ${E.unidadesMax}.`,
    );
  }
  if (temas.length > E.unidadesMax) faltantes.push(`Tiene ${temas.length} unidades: el estándar pide como máximo ${E.unidadesMax}.`);
  for (const t of temas) {
    if (t.subtemas.length < E.subtemasPorUnidadMin) {
      const missing = E.subtemasPorUnidadMin - t.subtemas.length;
      faltantes.push(
        `La unidad «${t.nombre}» tiene ${plural(t.subtemas.length, 'subtema', 'subtemas')}: ${missing === 1 ? 'falta 1' : `faltan ${missing}`} para llegar a ${E.subtemasPorUnidadMin}.`,
      );
    }
    if (t.subtemas.length > E.subtemasPorUnidadMax) {
      faltantes.push(`La unidad «${t.nombre}» tiene ${t.subtemas.length} subtemas: el estándar pide como máximo ${E.subtemasPorUnidadMax}.`);
    }
  }
  const short = calc.filter((s) => practice(s.id) < E.ejerciciosPorSubtemaDeCalculo);
  if (short.length > 0) {
    const need = short.reduce((n, s) => n + E.ejerciciosPorSubtemaDeCalculo - practice(s.id), 0);
    faltantes.push(
      `${need === 1 ? 'Falta' : 'Faltan'} ${plural(need, 'ejercicio', 'ejercicios')} en ${plural(short.length, 'subtema', 'subtemas')} de cálculo: ${short.map((s) => `«${s.nombre}»`).join(', ')}.`,
    );
  }
  const unitsRatio = Math.min(1, temas.length / Math.max(E.unidadesMin, unidadesObjetivo));
  const topicsRatio = Math.min(1, subtemas.length / (E.unidadesMin * E.subtemasPorUnidadMin));
  const practiceRatio = calc.length === 0 ? 1 : calcOk.length / calc.length;
  return {
    materiaId: materia.id,
    nombre: materia.nombre,
    unidades: temas.length,
    unidadesObjetivo,
    subtemas: subtemas.length,
    subtemasCalculo: calc.length,
    subtemasCalculoConPractica: calcOk.length,
    ejercicios: ejercicios.filter((e) => e.materia === materia.id).length,
    cumple: faltantes.length === 0,
    faltantes,
    avance: Math.round(((unitsRatio + topicsRatio + practiceRatio) / 3) * 100) / 100,
  };
}

export interface CycleCoverage {
  ciclo: number;
  materias: CoverageReport[];
  pendientes: { nombre: string; planes: number }[];
}

/** Coverage of one career, cycle by cycle: catalog subjects with their state and subjects not in ÁBACO yet. */
export function careerCoverage(carrera: Carrera, reports: ReadonlyMap<string, CoverageReport>): CycleCoverage[] {
  const cycles = new Map<number, CycleCoverage>();
  const get = (ciclo: number) => {
    const existing = cycles.get(ciclo);
    if (existing) return existing;
    const created: CycleCoverage = { ciclo, materias: [], pendientes: [] };
    cycles.set(ciclo, created);
    return created;
  };
  for (const e of carrera.materias) {
    const r = reports.get(e.materia);
    if (r) get(e.ciclo).materias.push(r);
  }
  for (const p of carrera.pendientes ?? []) get(p.ciclo).pendientes.push({ nombre: p.nombre, planes: p.planes });
  return [...cycles.values()].sort((a, b) => a.ciclo - b.ciclo);
}

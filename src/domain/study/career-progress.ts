import type { Carrera } from '../content/schemas';

/**
 * Progress over the career map ("malla"): each subject of the student's career, cycle by cycle, with what the student
 * has done in ÁBACO. The thresholds are ÁBACO's own criterion for "you master it", not a university rule.
 */
export const MASTERY = { exercises: 0.8, exam: 0.7 } as const;

export type MallaEstado = 'dominada' | 'en-curso' | 'sin-empezar' | 'fuera-de-abaco';

export interface MallaCelda {
  /** Catalog id; undefined for subjects of the career that ÁBACO does not cover yet. */
  id?: string;
  nombre: string;
  estado: MallaEstado;
  resueltos: number;
  total: number;
  /** Best practice exam score (0 to 1), or null if the student never took one. */
  mejorExamen: number | null;
}

export interface MallaCiclo {
  ciclo: number;
  celdas: MallaCelda[];
}

export interface CareerProgressInput {
  exercises: readonly { id: string; materia: string }[];
  solved: ReadonlySet<string>;
  exams: readonly { materiaId: string; total: number; correctas: number }[];
  nombre: (materiaId: string) => string;
}

export function subjectState(resueltos: number, total: number, mejorExamen: number | null): MallaEstado {
  const practiced = total === 0 || resueltos / total >= MASTERY.exercises;
  if (mejorExamen !== null && mejorExamen >= MASTERY.exam && practiced) return 'dominada';
  return resueltos > 0 || mejorExamen !== null ? 'en-curso' : 'sin-empezar';
}

export function careerProgress(carrera: Carrera, input: CareerProgressInput) {
  const best = new Map<string, number>();
  for (const e of input.exams) {
    if (e.total <= 0) continue;
    best.set(e.materiaId, Math.max(best.get(e.materiaId) ?? 0, e.correctas / e.total));
  }
  const cell = (id: string): MallaCelda => {
    const own = input.exercises.filter((e) => e.materia === id);
    const resueltos = own.filter((e) => input.solved.has(e.id)).length;
    const mejorExamen = best.get(id) ?? null;
    return {
      id,
      nombre: input.nombre(id),
      estado: subjectState(resueltos, own.length, mejorExamen),
      resueltos,
      total: own.length,
      mejorExamen,
    };
  };
  const ciclos: MallaCiclo[] = Array.from({ length: carrera.ciclos }, (_, i) => {
    const ciclo = i + 1;
    return {
      ciclo,
      celdas: [
        ...carrera.materias.filter((m) => m.ciclo === ciclo).map((m) => cell(m.materia)),
        ...(carrera.pendientes ?? [])
          .filter((p) => p.ciclo === ciclo)
          .map((p): MallaCelda => ({
            nombre: p.nombre,
            estado: 'fuera-de-abaco',
            resueltos: 0,
            total: 0,
            mejorExamen: null,
          })),
      ],
    };
  });
  const all = ciclos.flatMap((c) => c.celdas);
  const count = (estado: MallaEstado) => all.filter((c) => c.estado === estado).length;
  return {
    ciclos,
    resumen: {
      dominadas: count('dominada'),
      enCurso: count('en-curso'),
      sinEmpezar: count('sin-empezar'),
      fueraDeAbaco: count('fuera-de-abaco'),
      enAbaco: all.length - count('fuera-de-abaco'),
    },
  };
}

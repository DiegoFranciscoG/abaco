import { describe, expect, it } from 'vitest';
import type { Carrera } from '../../src/domain/content/schemas';
import { careerProgress, subjectState } from '../../src/domain/study/career-progress';

const carrera: Carrera = {
  id: 'contabilidad-auditoria',
  nombre: 'Contabilidad y auditoría',
  descripcion: 'Carrera de prueba.',
  planes: 3,
  ciclos: 2,
  materias: [
    { materia: 'contabilidad-general', ciclo: 1, ciclos: [1], planes: 3 },
    { materia: 'etica-profesional', ciclo: 1, ciclos: [1], planes: 2 },
    { materia: 'tributacion', ciclo: 2, ciclos: [2], planes: 3 },
  ],
  pendientes: [{ nombre: 'Auditoría I', ciclo: 2, planes: 3 }],
};

const exercises = [
  ...Array.from({ length: 5 }, (_, i) => ({ id: `cg-${i}`, materia: 'contabilidad-general' })),
  { id: 'tr-0', materia: 'tributacion' },
  { id: 'tr-1', materia: 'tributacion' },
];

describe('avance por malla', () => {
  it('a subject is mastered with a 70 % exam and 80 % of its exercises solved', () => {
    expect(subjectState(4, 5, 0.7)).toBe('dominada');
    expect(subjectState(3, 5, 0.9)).toBe('en-curso');
    expect(subjectState(5, 5, 0.6)).toBe('en-curso');
    expect(subjectState(5, 5, null)).toBe('en-curso');
    expect(subjectState(0, 5, null)).toBe('sin-empezar');
    // Subjects without exercises are measured by the exam alone.
    expect(subjectState(0, 0, 0.8)).toBe('dominada');
    expect(subjectState(0, 0, null)).toBe('sin-empezar');
  });

  it('places each subject in its usual cycle, with the ones ÁBACO does not cover yet', () => {
    const { ciclos, resumen } = careerProgress(carrera, {
      exercises,
      solved: new Set(['cg-0', 'cg-1', 'cg-2', 'cg-3', 'tr-0']),
      exams: [
        { materiaId: 'contabilidad-general', total: 10, correctas: 6 },
        { materiaId: 'contabilidad-general', total: 10, correctas: 8 },
        { materiaId: 'etica-profesional', total: 0, correctas: 0 },
      ],
      nombre: (id) => id,
    });
    expect(ciclos.map((c) => c.celdas.map((x) => [x.nombre, x.estado]))).toEqual([
      [
        ['contabilidad-general', 'dominada'],
        ['etica-profesional', 'sin-empezar'],
      ],
      [
        ['tributacion', 'en-curso'],
        ['Auditoría I', 'fuera-de-abaco'],
      ],
    ]);
    expect(ciclos[0]!.celdas[0]).toMatchObject({ resueltos: 4, total: 5, mejorExamen: 0.8 });
    expect(resumen).toEqual({ dominadas: 1, enCurso: 1, sinEmpezar: 1, fueraDeAbaco: 1, enAbaco: 3 });
  });
});

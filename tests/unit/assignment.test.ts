import { describe, expect, it } from 'vitest';
import {
  ASSIGNMENT_LIMITS,
  assignmentPath,
  cleanTitle,
  formatAnswer,
  parseAssignment,
} from '../../src/domain/teacher/assignment';

const known = new Set(['ej-cg-patrimonio', 'ej-cg-pasivo', 'ej-mf-cuota']);
const read = (path: string) => parseAssignment(new URLSearchParams(path.split('?')[1]), known);

describe('teacher worksheet link', () => {
  it('goes and comes back with the title and the order the teacher chose', () => {
    const path = assignmentPath({
      titulo: 'Taller 1: ecuación contable',
      ids: ['ej-cg-pasivo', 'ej-cg-patrimonio'],
    });
    expect(path.startsWith('/practica?')).toBe(true);
    expect(read(path)).toEqual({
      titulo: 'Taller 1: ecuación contable',
      ids: ['ej-cg-pasivo', 'ej-cg-patrimonio'],
    });
  });

  it('drops unknown, repeated and malformed ids, and gives up when nothing is left', () => {
    expect(
      read('/practica?ejercicios=ej-cg-pasivo,no-existe,ej-cg-pasivo,<script>,ej-mf-cuota')?.ids,
    ).toEqual(['ej-cg-pasivo', 'ej-mf-cuota']);
    expect(read('/practica?ejercicios=no-existe')).toBeNull();
    expect(read('/practica?materia=contabilidad-general')).toBeNull();
  });

  it('keeps the title as plain, short text and caps the number of exercises', () => {
    expect(cleanTitle('  Taller\u0000 de\n\ncostos  ')).toBe('Taller de costos');
    expect(cleanTitle('x'.repeat(200))).toHaveLength(ASSIGNMENT_LIMITS.maxTitle);
    const many = Array.from({ length: 50 }, (_, i) => `ej-${i}`);
    const params = new URLSearchParams(assignmentPath({ titulo: '', ids: many }).split('?')[1]);
    expect(params.get('ejercicios')!.split(',')).toHaveLength(ASSIGNMENT_LIMITS.maxExercises);
    expect(params.has('titulo')).toBe(false);
  });

  it('prints answers in Ecuadorian format with their unit', () => {
    expect(formatAnswer(32700, 'USD')).toBe('32.700 USD');
    expect(formatAnswer(1844.926, 'USD')).toBe('1.844,926 USD');
    expect(formatAnswer(12.5, '%')).toBe('12,5 %');
    expect(formatAnswer(0.25, 'sin unidad')).toBe('0,25');
  });
});

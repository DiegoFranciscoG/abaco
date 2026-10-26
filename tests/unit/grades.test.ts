import { describe, expect, it } from 'vitest';
import { neededGrade, validateGrades, type GradeComponent } from '../../src/domain/grades/needed';

const scale10 = (componentes: GradeComponent[], objetivo = 7) => ({ componentes, notaMaxima: 10, objetivo });

/** T-15: the grade calculator never gives a meaningless result. Every expected value was worked out by hand. */
describe('T-15: calculadora de notas', () => {
  it('computes the average needed on what is pending', () => {
    // Accumulated: 8 × 30 % + 6 × 30 % = 4,2. Needed: (7 − 4,2) ÷ 40 % = 7.
    const r = neededGrade(
      scale10([
        { nombre: 'Primer parcial', peso: 30, nota: 8 },
        { nombre: 'Deberes', peso: 30, nota: 6 },
        { nombre: 'Examen final', peso: 40, nota: null },
      ]),
    );
    expect(r).toMatchObject({
      estado: 'necesita',
      necesaria: 7,
      acumulado: 4.2,
      pesoPendiente: 40,
      maximoPosible: 8.2,
    });
    if (r.estado !== 'necesita') throw new Error('unexpected');
    expect(r.pasos).toEqual([
      'Acumulado = 8 × 30 % + 6 × 30 % = 4,2',
      'Peso pendiente = 40 % = 40 %',
      'Promedio necesario en lo pendiente = (7 − 4,2) ÷ 40 % = 7',
    ]);
  });

  it('rounds the needed grade up to the cent so reaching it is enough', () => {
    // Accumulated 6,5 × 40 % = 2,6; needed (7 − 2,6) ÷ 60 % = 7,3333… → 7,34.
    const r = neededGrade(
      scale10([
        { nombre: 'Parcial', peso: 40, nota: 6.5 },
        { nombre: 'Final', peso: 60, nota: null },
      ]),
    );
    expect(r).toMatchObject({ estado: 'necesita', necesaria: 7.34 });
    // 2,6 + 7,34 × 0,6 = 7,004 ≥ 7, while 7,33 would give 6,998.
    expect(2.6 + 7.34 * 0.6).toBeGreaterThanOrEqual(7);
    expect(2.6 + 7.33 * 0.6).toBeLessThan(7);
  });

  it('already passed: says so even with zero in what is pending', () => {
    // 9 × 40 % + 10 × 40 % = 7,6 ≥ 7 with the final exam (20 %) still pending.
    const r = neededGrade(
      scale10([
        { nombre: 'Parcial 1', peso: 40, nota: 9 },
        { nombre: 'Parcial 2', peso: 40, nota: 10 },
        { nombre: 'Final', peso: 20, nota: null },
      ]),
    );
    expect(r).toMatchObject({ estado: 'asegurado', acumulado: 7.6 });
  });

  it('impossible to pass: says so and shows the best grade still reachable', () => {
    // 2 × 50 % = 1; with 10 in the other 50 % the best final is 6 < 7.
    const r = neededGrade(
      scale10([
        { nombre: 'Parcial', peso: 50, nota: 2 },
        { nombre: 'Final', peso: 50, nota: null },
      ]),
    );
    expect(r).toMatchObject({ estado: 'imposible', maximoPosible: 6 });
    if (r.estado !== 'imposible') throw new Error('unexpected');
    expect(r.pasos.at(-1)).toBe('Con 10 en todo lo pendiente llegarías a 6, menos que 7');
  });

  it('needing exactly the highest grade is still possible', () => {
    // 4 × 50 % = 2; (7 − 2) ÷ 50 % = 10.
    const r = neededGrade(
      scale10([
        { nombre: 'A', peso: 50, nota: 4 },
        { nombre: 'B', peso: 50, nota: null },
      ]),
    );
    expect(r).toMatchObject({ estado: 'necesita', necesaria: 10 });
  });

  it('with every grade in, reports the final grade as passed or failed', () => {
    expect(
      neededGrade(
        scale10([
          { nombre: 'A', peso: 50, nota: 7 },
          { nombre: 'B', peso: 50, nota: 7 },
        ]),
      ),
    ).toMatchObject({ estado: 'aprobado', final: 7 });
    expect(
      neededGrade(
        scale10([
          { nombre: 'A', peso: 50, nota: 6.99 },
          { nombre: 'B', peso: 50, nota: 7 },
        ]),
      ),
    ).toMatchObject({ estado: 'reprobado', final: 6.99 });
  });

  it('works on other scales (out of 20 and out of 100)', () => {
    // Out of 20: 14 × 60 % = 8,4; (14 − 8,4) ÷ 40 % = 14.
    expect(
      neededGrade({
        componentes: [
          { nombre: 'Gestión', peso: 60, nota: 14 },
          { nombre: 'Examen', peso: 40, nota: null },
        ],
        notaMaxima: 20,
        objetivo: 14,
      }),
    ).toMatchObject({ estado: 'necesita', necesaria: 14 });
    // Out of 100: 50 × 70 % = 35; (70 − 35) ÷ 30 % = 116,7 > 100.
    expect(
      neededGrade({
        componentes: [
          { nombre: 'Proceso', peso: 70, nota: 50 },
          { nombre: 'Final', peso: 30, nota: null },
        ],
        notaMaxima: 100,
        objetivo: 70,
      }),
    ).toMatchObject({ estado: 'imposible', maximoPosible: 65 });
  });

  it('weights that do not add up to 100 are rejected with the actual sum', () => {
    const r = neededGrade(
      scale10([
        { nombre: 'A', peso: 30, nota: 8 },
        { nombre: 'B', peso: 50, nota: null },
      ]),
    );
    expect(r).toEqual({ estado: 'invalido', errores: ['Los pesos suman 80 %; tienen que sumar 100 %.'] });
    // Decimal weights that do add up are accepted.
    expect(
      neededGrade(
        scale10([
          { nombre: 'A', peso: 33.33, nota: 8 },
          { nombre: 'B', peso: 33.33, nota: 8 },
          { nombre: 'C', peso: 33.34, nota: null },
        ]),
      ).estado,
    ).toBe('necesita');
  });

  it('grades outside the scale, negative weights and an impossible target are rejected', () => {
    expect(
      validateGrades(
        scale10([
          { nombre: 'Parcial', peso: 50, nota: 12 },
          { nombre: 'Final', peso: 50, nota: -1 },
        ]),
      ),
    ).toEqual([
      'La nota de «Parcial» (12) está fuera de la escala de 0 a 10.',
      'La nota de «Final» (-1) está fuera de la escala de 0 a 10.',
    ]);
    expect(validateGrades(scale10([{ nombre: '', peso: -100, nota: null }]))).toContain(
      'El peso de «componente 1» tiene que ser mayor que 0 %.',
    );
    expect(validateGrades(scale10([{ nombre: 'Único', peso: 100, nota: null }], 11))).toEqual([
      'La nota que quieres alcanzar tiene que estar entre 0 y 10.',
    ]);
    expect(validateGrades({ componentes: [], notaMaxima: 0, objetivo: 0 })).toEqual([
      'La nota máxima de la escala tiene que ser mayor que cero.',
    ]);
    expect(validateGrades(scale10([]))).toEqual(['Agrega al menos un componente de evaluación.']);
    expect(neededGrade(scale10([{ nombre: 'X', peso: Number.NaN, nota: null }])).estado).toBe('invalido');
  });

  it('a single pending component worth 100 % needs exactly the target', () => {
    expect(neededGrade(scale10([{ nombre: 'Final', peso: 100, nota: null }]))).toMatchObject({
      estado: 'necesita',
      necesaria: 7,
      acumulado: 0,
    });
  });
});

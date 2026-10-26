import { describe, expect, it } from 'vitest';
import { carrerasDeMateria, getCarrera, materiasDeCiclo } from '../../src/data/content';
import { DEFAULT_PROFILE } from '../../src/data/types';
import { otherCycles, readSelection } from '../../src/features/subjects/career-selection';

describe('carrera → ciclo → materia', () => {
  it('describes the other cycles in which a subject appears', () => {
    expect(otherCycles([3], 3)).toBe('');
    expect(otherCycles([3, 4], 3)).toBe('también en el ciclo 4');
    expect(otherCycles([3, 4, 5, 6], 3)).toBe('también en los ciclos 4, 5 y 6');
  });

  it('reads the selection from the URL first and from the profile otherwise', () => {
    const profile = { ...DEFAULT_PROFILE, carrera: 'economia', ciclo: 3 };
    expect(readSelection(new URLSearchParams(''), profile)).toMatchObject({
      carrera: { id: 'economia' },
      ciclo: 3,
    });
    expect(readSelection(new URLSearchParams('carrera=finanzas'), profile)).toMatchObject({
      carrera: { id: 'finanzas' },
      ciclo: null,
    });
    expect(readSelection(new URLSearchParams('carrera=finanzas&ciclo=2'), profile)).toMatchObject({
      ciclo: 2,
    });
  });

  it('ignores unknown careers and impossible cycles', () => {
    expect(readSelection(new URLSearchParams('carrera=no-existe'), DEFAULT_PROFILE).carrera).toBeUndefined();
    expect(readSelection(new URLSearchParams('carrera=economia&ciclo=99'), DEFAULT_PROFILE).ciclo).toBeNull();
    expect(
      readSelection(new URLSearchParams('carrera=economia&ciclo=2.5'), DEFAULT_PROFILE).ciclo,
    ).toBeNull();
    expect(readSelection(new URLSearchParams('carrera=economia&ciclo=-1'), DEFAULT_PROFILE).ciclo).toBeNull();
  });

  it('lists the subjects of a cycle and the careers of a subject', () => {
    const economia = getCarrera('economia')!;
    expect(
      materiasDeCiclo(economia, 3)
        .map((r) => r.materia.id)
        .sort(),
    ).toEqual(
      ['estadistica-inferencial', 'investigacion-mercados', 'macroeconomia', 'matematica-financiera'].sort(),
    );
    const all = materiasDeCiclo(economia);
    expect(all.map((r) => r.entrada.ciclo)).toEqual(
      [...all.map((r) => r.entrada.ciclo)].sort((a, b) => a - b),
    );
    expect(carrerasDeMateria('tributacion').map((c) => c.carrera.id)).toEqual([
      'contabilidad-auditoria',
      'emprendimiento-innovacion',
    ]);
  });
});

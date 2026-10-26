import { describe, expect, it } from 'vitest';
import {
  calculate,
  parseAnswer,
  parseNumberInput,
  parseNumberList,
  solveImplicit,
} from '../../src/domain/formula/calculator';
import {
  digitFromRod,
  digitsOf,
  earthY,
  heavenY,
  pushEarth,
  rodFromDigit,
  springStep,
  stepDigit,
  toggleHeaven,
  valueOf,
} from '../../src/ui/three/soroban';

describe('formula calculator', () => {
  it('parses single numbers and lists in Spanish or English notation', () => {
    expect(parseNumberInput('1.500,75')).toBe(1500.75);
    expect(parseNumberInput('0.01')).toBe(0.01);
    expect(parseNumberInput('abc')).toBeNull();
    expect(parseNumberList('120; 135,5; 150')).toEqual([120, 135.5, 150]);
    expect(parseNumberList('2 4 4')).toEqual([2, 4, 4]);
    expect(parseNumberList('1; x')).toBeNull();
    expect(parseNumberList('   ')).toBeNull();
  });

  it('computes direct formulas and explains invalid data', () => {
    expect(calculate({ tipo: 'directo', expresion: 'VF / (1 + i) ^ n' }, { VF: 1210, i: 0.1, n: 2 })).toEqual(
      { ok: true, value: expect.closeTo(1000, 9) },
    );
    expect(calculate({ tipo: 'directo', expresion: 'CF / (P - CVu)' }, { CF: 100, P: 5, CVu: 5 })).toEqual({
      ok: false,
      message: expect.stringMatching(/cero/),
    });
    expect(calculate({ tipo: 'directo', expresion: '1 +' }, {})).toEqual({
      ok: false,
      message: expect.stringMatching(/termina/),
    });
  });

  it('solves implicit formulas such as the IRR', () => {
    const result = calculate(
      {
        tipo: 'implicito',
        expresion: '-I0 + FC1 / (1 + r) + FC2 / (1 + r) ^ 2 + FC3 / (1 + r) ^ 3',
        incognita: 'r',
      },
      { I0: 10000, FC1: 3000, FC2: 4000, FC3: 5000 },
    );
    expect(result.ok && result.value).toBeCloseTo(0.0889634, 6);
    expect(solveImplicit('x * x + 1', {}, 'x')).toEqual({ ok: false, message: expect.any(String) });
    expect(calculate({ tipo: 'implicito', expresion: 'r' }, {})).toEqual({
      ok: false,
      message: 'Falta la incógnita',
    });
  });

  it('reads answers with percent signs and decimal commas', () => {
    expect(parseAnswer('0,5367', true)).toBe(0.5367);
    expect(parseAnswer('53,67 %', true)).toBeCloseTo(0.5367, 10);
    expect(parseAnswer('53,67', true)).toBeCloseTo(0.5367, 10);
    expect(parseAnswer('1.050,00', false)).toBe(1050);
    expect(parseAnswer('-0,4737', false)).toBe(-0.4737);
    expect(parseAnswer('', false)).toBeNull();
    expect(parseAnswer('doce', false)).toBeNull();
  });
});

describe('soroban (3D abacus logic)', () => {
  it('maps numbers to digits and back', () => {
    expect(digitsOf(2026)).toEqual([0, 2, 0, 2, 6]);
    expect(digitsOf(-5)).toEqual([0, 0, 0, 0, 0]);
    expect(digitsOf(1e9)).toEqual([9, 9, 9, 9, 9]);
    expect(valueOf([0, 2, 0, 2, 6])).toBe(2026);
  });

  it('represents each digit with one 5-bead and four 1-beads', () => {
    expect(rodFromDigit(7)).toEqual({ heaven: true, earth: 2 });
    expect(digitFromRod({ heaven: false, earth: 3 })).toBe(3);
  });

  it('moves beads like real fingers do', () => {
    expect(toggleHeaven(2)).toBe(7);
    expect(toggleHeaven(7)).toBe(2);
    expect(pushEarth(0, 2)).toBe(3); // pushing the third bead lifts three beads
    expect(pushEarth(3, 0)).toBe(0); // pulling the first active bead drops all of them
    expect(pushEarth(6, 1)).toBe(7); // 6 = 5 + 1: the second lower bead is down, pushing it adds one
  });

  it('wraps digits with the keyboard', () => {
    expect(stepDigit(9, 1)).toBe(0);
    expect(stepDigit(0, -1)).toBe(9);
  });

  it('places beads without overlaps and settles with the spring', () => {
    expect(heavenY(true)).toBeLessThan(heavenY(false));
    for (let j = 0; j < 4; j += 1) expect(earthY(j, true)).toBeGreaterThan(earthY(j, false));
    let state = { position: 0, velocity: 0 };
    for (let i = 0; i < 200; i += 1) state = springStep(state.position, state.velocity, 1, 1 / 60);
    expect(state.position).toBeCloseTo(1, 3);
  });
});

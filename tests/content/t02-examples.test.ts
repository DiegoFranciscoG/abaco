import { describe, expect, it } from 'vitest';
import {
  asNumber,
  canonicalFunctionName,
  compactFormula,
  evaluateAlgebra,
  evaluateExcel,
  FormulaError,
  isClose,
  parse,
  SPANISH_TO_ENGLISH,
  translateFormula,
  type Node,
} from '../../src/domain/formula';
import { FUNCTION_CATALOG } from '../../src/domain/formula/functions';
import { computeSheet } from '../../src/domain/sheet/sheet';
import { loadAllContent } from './load-content';

const content = loadAllContent();
const SUPPORTED = new Set(FUNCTION_CATALOG.map((f) => f.name));
const SPANISH_NAMES = new Set(Object.keys(SPANISH_TO_ENGLISH));

function numberOrFail(label: string, value: ReturnType<typeof evaluateAlgebra>): number {
  const n = asNumber(value);
  if (n instanceof FormulaError) throw new Error(`${label}: el cálculo devolvió ${n.code}`);
  return n;
}

function calledFunctions(node: Node, out: string[] = []): string[] {
  switch (node.type) {
    case 'call':
      out.push(node.name);
      node.args.forEach((a) => calledFunctions(a, out));
      break;
    case 'binary':
      calledFunctions(node.left, out);
      calledFunctions(node.right, out);
      break;
    case 'unary':
    case 'percent':
      calledFunctions(node.operand, out);
      break;
    case 'array':
      node.rows.flat().forEach((c) => calledFunctions(c, out));
      break;
    default:
      break;
  }
  return out;
}

/**
 * T-02: every numeric example is recalculated three independent ways and must match the published result
 * within the declared tolerance: (1) the algebraic expression, (2) the Excel formula in English syntax and
 * (3) the same formula in Spanish syntax. Results were produced by a separate Python script.
 */
describe('T-02: los ejemplos numéricos cuadran', () => {
  const verified = content.formulas.filter((f) => f.estado === 'verificada');

  it('there are between 60 and 150 verified formulas', () => {
    expect(verified.length).toBeGreaterThanOrEqual(60);
    expect(verified.length).toBeLessThanOrEqual(150);
  });

  describe.each(verified.map((f) => [f.id, f] as const))('%s', (_id, formula) => {
    const { ejemplo, calculo } = formula;

    it('algebraic expression', () => {
      if (calculo.tipo === 'directo') {
        const value = numberOrFail(formula.id, evaluateAlgebra(calculo.expresion, ejemplo.entradas));
        expect(isClose(value, ejemplo.resultado, ejemplo.tolerancia), `${value} vs ${ejemplo.resultado}`).toBe(true);
      } else {
        const unknown = calculo.incognita as string;
        const residual = numberOrFail(
          formula.id,
          evaluateAlgebra(calculo.expresion, { ...ejemplo.entradas, [unknown]: ejemplo.resultado }),
        );
        expect(Math.abs(residual), `residuo ${residual}`).toBeLessThanOrEqual(calculo.tolerancia_residuo as number);
      }
    });

    it('Excel formula (English syntax)', () => {
      const value = numberOrFail(formula.id, evaluateExcel(ejemplo.excel_en, ejemplo.celdas ?? {}, 'en'));
      expect(isClose(value, ejemplo.resultado, ejemplo.tolerancia), `${value} vs ${ejemplo.resultado}`).toBe(true);
    });

    it('Excel formula (Spanish syntax) and translation consistency', () => {
      const value = numberOrFail(formula.id, evaluateExcel(ejemplo.excel_es, ejemplo.celdas ?? {}, 'es'));
      expect(isClose(value, ejemplo.resultado, ejemplo.tolerancia), `${value} vs ${ejemplo.resultado}`).toBe(true);
      expect(compactFormula(translateFormula(ejemplo.excel_en, 'en', 'es'))).toBe(compactFormula(ejemplo.excel_es));
    });

    it('generic Excel templates only use supported, verified function names', () => {
      for (const name of calledFunctions(parse(formula.excel.en, { locale: 'en', mode: 'algebra' }))) {
        expect(SUPPORTED.has(name), `${name} (inglés)`).toBe(true);
      }
      for (const name of calledFunctions(parse(formula.excel.es, { locale: 'es', mode: 'algebra' }))) {
        const canonical = canonicalFunctionName(name);
        expect(SUPPORTED.has(canonical), `${name} (español)`).toBe(true);
        expect(SPANISH_NAMES.has(name) || name === canonical, `${name} no es un nombre verificado en español`).toBe(true);
      }
    });
  });
});

describe('T-02: los ejercicios tienen respuesta correcta', () => {
  it.each(content.ejercicios.map((e) => [e.id, e] as const))('%s', (_id, ejercicio) => {
    const value = numberOrFail(ejercicio.id, evaluateAlgebra(ejercicio.calculo, ejercicio.datos));
    expect(isClose(value, ejercicio.respuesta, ejercicio.tolerancia), `${value} vs ${ejercicio.respuesta}`).toBe(true);
  });
});

describe('T-02: las plantillas del laboratorio calculan lo que prometen', () => {
  it.each(content.plantillas.map((p) => [p.id, p] as const))('%s', (_id, plantilla) => {
    const cells = Object.fromEntries(Object.entries(plantilla.celdas).map(([k, v]) => [k, String(v)]));
    const results = computeSheet(cells, 'en');
    for (const check of plantilla.verificacion) {
      const value = results[check.celda]?.value;
      expect(typeof value, `${plantilla.id}!${check.celda}`).toBe('number');
      expect(isClose(value as number, check.esperado, check.tolerancia), `${check.celda}: ${String(value)} vs ${check.esperado}`).toBe(true);
    }
    for (const [key, result] of Object.entries(results)) {
      expect(result.value instanceof FormulaError, `${plantilla.id}!${key} produce un error`).toBe(false);
    }
  });
});

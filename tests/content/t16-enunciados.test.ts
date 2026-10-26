import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { enunciadosFileSchema } from '../../src/domain/content/schemas';
import { buildStatementCatalog } from '../../src/domain/statement/catalog';
import { contentWords, createMatcher, findPhrase } from '../../src/domain/statement/match';
import { getDeliverable } from '../../src/domain/deliverables/catalog';
import { TOOLS } from '../../src/domain/tools/catalog';
import { CONTENT_ROOT, loadAllContent } from './load-content';

const content = loadAllContent();
const conceptos = enunciadosFileSchema.parse(JSON.parse(readFileSync(join(CONTENT_ROOT, 'enunciados.json'), 'utf8')));
const fixture = JSON.parse(
  readFileSync(join(CONTENT_ROOT, '..', 'tests', 'fixtures', 'enunciados-t16.json'), 'utf8'),
) as {
  dentro: { texto: string; esperado: string[] }[];
  control: { texto: string; esperado: string[] }[];
  ciego: { texto: string; esperado: string[] }[];
  fuera: string[];
};
const matchStatement = createMatcher(
  buildStatementCatalog({ conceptos, temarios: content.temarios.map((t) => t.data), formulas: content.formulas }),
);

const subtemaIds = new Set(content.temarios.flatMap((t) => t.data.temas.flatMap((tema) => tema.subtemas.map((s) => s.id))));
const formulaIds = new Set(content.formulas.map((f) => f.id));

describe('diccionario de enunciados', () => {
  it('has at least 150 phrases in the language students use, and every link exists', () => {
    expect(conceptos.reduce((sum, c) => sum + c.frases.length, 0)).toBeGreaterThanOrEqual(150);
    const ids = conceptos.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of conceptos) {
      for (const s of c.subtemas) expect(subtemaIds.has(s), `${c.id} → subtema ${s}`).toBe(true);
      for (const f of c.formulas) expect(formulaIds.has(f), `${c.id} → fórmula ${f}`).toBe(true);
      for (const t of c.herramientas) expect(TOOLS.some((tool) => tool.id === t), `${c.id} → ${t}`).toBe(true);
      for (const d of c.entregables) expect(getDeliverable(d), `${c.id} → entregable ${d}`).toBeDefined();
      expect(new Set(c.frases).size, `${c.id}: frases repetidas`).toBe(c.frases.length);
    }
  });

  it('every phrase keeps at least one meaningful word and wildcards only end words', () => {
    for (const c of conceptos) {
      for (const f of c.frases) {
        expect(contentWords(f.replace(/\*/g, '')).length, `${c.id}: «${f}»`).toBeGreaterThan(0);
        expect(/\*\S/.test(f), `${c.id}: «${f}»`).toBe(false);
      }
    }
  });
});

describe('coincidencia de frases', () => {
  it('matches words in order, folding plurals, accents and wildcard endings', () => {
    const words = contentWords('Elabore la tabla de amortización de los préstamos');
    expect(findPhrase(words, 'tabla de amortizac*')).toBe(1);
    expect(findPhrase(contentWords('¿Cuánto le descuentan de su sueldo?'), 'cuanto me descuentan')).toBe(0);
    expect(findPhrase(contentWords('Costos fijos y variables'), 'costo* fijo* y variable*')).toBe(0);
  });

  it('does not match words out of order or too far apart', () => {
    expect(findPhrase(contentWords('Si la función de costo es cuadrática'), 'funcion si')).toBe(-1);
    expect(findPhrase(contentWords('Use la función SI para clasificar'), 'funcion si')).toBe(1);
    expect(
      findPhrase(contentWords('los costos fijos son 8000 el precio de venta 20 y el costo variable 12'), 'costo* fijo* y variable*'),
    ).toBe(-1);
  });

  it('asks for more text when the statement is too short', () => {
    expect(matchStatement('IVA')).toEqual({ confianza: 'baja', opciones: [], muyCorto: true });
  });
});

/**
 * T-16: hand-labelled homework statements in three sets. «dentro» guided the dictionary, «control» was measured
 * before tuning it (25 %) and «ciego» was written after every change and measured once (81,3 %). The right topic
 * has to come first in more than 70 % of each set, and a confident answer is almost never wrong.
 */
describe('T-16: pega tu enunciado', () => {
  const evaluate = (set: { texto: string; esperado: string[] }[]) =>
    set.map((e) => {
      const match = matchStatement(e.texto);
      const top = match.opciones[0]?.subtema?.id;
      return { ...e, match, top, acierto: match.confianza !== 'baja' && top !== undefined && e.esperado.includes(top) };
    });

  it('has at least 30 labelled statements and every expected subtopic exists', () => {
    expect(fixture.dentro.length).toBeGreaterThanOrEqual(30);
    for (const e of [...fixture.dentro, ...fixture.control, ...fixture.ciego]) {
      for (const s of e.esperado) expect(subtemaIds.has(s), s).toBe(true);
    }
  });

  for (const name of ['dentro', 'control', 'ciego'] as const) {
    it(`finds the right topic in more than 70 % of the «${name}» statements`, () => {
      const results = evaluate(fixture[name]);
      const fallos = results
        .filter((r) => !r.acierto)
        .map((r) => `${r.texto} → ${r.top ?? 'nada'} (${r.match.confianza})`);
      expect((results.length - fallos.length) / results.length, fallos.join('\n')).toBeGreaterThan(0.7);
      const wrongButSure = results.filter((r) => r.match.confianza === 'alta' && !r.acierto);
      expect(wrongButSure.length, wrongButSure.map((r) => r.texto).join('\n')).toBeLessThanOrEqual(1);
    });
  }

  it('says it is not sure for statements outside these careers instead of guessing', () => {
    for (const texto of fixture.fuera) {
      const match = matchStatement(texto);
      expect(match.confianza, texto).toBe('baja');
      expect(match.opciones, texto).toEqual([]);
    }
  });
});

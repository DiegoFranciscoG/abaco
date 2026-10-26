import { describe, expect, it } from 'vitest';
import type { FuenteRef } from '../../src/domain/content/schemas';
import { TOOLS } from '../../src/domain/tools/catalog';
import { loadAllContent } from './load-content';

const content = loadAllContent();
const catalog = new Map(content.fuentes.map((f) => [f.id, f]));
const TODAY = new Date('2026-12-31');

function checkRef(where: string, ref: FuenteRef): string | null {
  const base = catalog.get(ref.ref);
  if (!base) return `${where}: la fuente «${ref.ref}» no existe en fuentes.json`;
  const url = ref.url ?? base.url;
  if (!url.startsWith('https://')) return `${where}: la URL de la fuente no usa https`;
  const date = new Date(base.fecha_consulta);
  if (Number.isNaN(date.getTime()) || date > TODAY) return `${where}: fecha de consulta inválida`;
  return null;
}

/** T-01: every published record resolves to a source with URL and consultation date. */
describe('T-01: toda ficha tiene fuente', () => {
  it('every subtopic of the deep content', () => {
    const problems: string[] = [];
    for (const { data } of content.temarios) {
      for (const tema of data.temas) {
        for (const subtema of tema.subtemas) {
          const problem = checkRef(`subtema ${subtema.id}`, subtema.fuente);
          if (problem) problems.push(problem);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('formulas, exercises, glossary terms and templates', () => {
    const problems = [
      ...content.formulas.map((f) => checkRef(`fórmula ${f.id}`, f.fuente)),
      ...content.ejercicios.map((e) => checkRef(`ejercicio ${e.id}`, e.fuente)),
      ...content.glosario.map((t) => checkRef(`término ${t.id}`, t.fuente)),
      ...content.plantillas.map((p) => checkRef(`plantilla ${p.id}`, p.fuente)),
    ].filter(Boolean);
    expect(problems).toEqual([]);
  });

  it('every normative figure cites an official source', () => {
    const problems = [
      ...content.normativa.map((c) => checkRef(`cifra ${c.id}`, c.fuente)),
      ...content.indicadores.map((i) => checkRef(`indicador ${i.id}`, i.fuente)),
    ].filter(Boolean);
    expect(problems).toEqual([]);
  });

  it('every study tool cites sources that exist in the catalog', () => {
    const problems = TOOLS.flatMap((t) => t.fuentes.map((ref) => checkRef(`herramienta ${t.id}`, { ref }))).filter(Boolean);
    expect(problems).toEqual([]);
  });

  it('apps point to their official site with a consultation date', () => {
    for (const app of content.apps) {
      expect(app.url_oficial, app.id).toMatch(/^https:\/\//);
      expect(Number.isNaN(new Date(app.fecha_consulta).getTime()), app.id).toBe(false);
    }
  });

  it('every source in the catalog is used at least once (no orphan citations)', () => {
    const used = new Set<string>();
    const collect = (ref: FuenteRef) => used.add(ref.ref);
    TOOLS.forEach((t) => t.fuentes.forEach((ref) => collect({ ref })));
    content.temarios.forEach((t) => t.data.temas.forEach((tema) => tema.subtemas.forEach((s) => collect(s.fuente))));
    content.formulas.forEach((f) => collect(f.fuente));
    content.ejercicios.forEach((e) => collect(e.fuente));
    content.glosario.forEach((t) => collect(t.fuente));
    content.plantillas.forEach((p) => collect(p.fuente));
    content.normativa.forEach((c) => collect(c.fuente));
    content.indicadores.forEach((i) => collect(i.fuente));
    const orphans = content.fuentes.map((f) => f.id).filter((id) => !used.has(id));
    expect(orphans).toEqual([]);
  });
});

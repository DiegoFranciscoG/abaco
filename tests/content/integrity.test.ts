import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkArithmetic } from '../../src/domain/content/arithmetic';
import { TOOLS } from '../../src/domain/tools/catalog';
import { allContentText, CONTENT_ROOT, loadAllContent } from './load-content';

const content = loadAllContent();
const materiaIds = new Set(content.materias.map((m) => m.id));
const formulaIds = new Set(content.formulas.map((f) => f.id));
const subtemaIds = new Set(content.temarios.flatMap((t) => t.data.temas.flatMap((tema) => tema.subtemas.map((s) => s.id))));
const toolIds = new Set(TOOLS.map((t) => t.id));

function duplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  return ids.filter((id) => (seen.has(id) ? true : (seen.add(id), false)));
}

describe('integridad del contenido', () => {
  it('identifiers are unique in every collection', () => {
    expect(duplicates(content.fuentes.map((f) => f.id))).toEqual([]);
    expect(duplicates(content.materias.map((m) => m.id))).toEqual([]);
    expect(duplicates(content.formulas.map((f) => f.id))).toEqual([]);
    expect(duplicates(content.ejercicios.map((e) => e.id))).toEqual([]);
    expect(duplicates(content.apps.map((a) => a.id))).toEqual([]);
    expect(duplicates(content.glosario.map((t) => t.id))).toEqual([]);
    expect(duplicates(content.plantillas.map((p) => p.id))).toEqual([]);
    expect(duplicates(content.temarios.flatMap((t) => t.data.temas.map((tema) => tema.id)))).toEqual([]);
    expect(duplicates(content.temarios.flatMap((t) => t.data.temas.flatMap((tema) => tema.subtemas.map((s) => s.id))))).toEqual([]);
  });

  it('the glossary has one entry per term in each language, and IFRS names follow the official Spanish translation', () => {
    const lower = (s: string) => s.toLowerCase();
    expect(duplicates(content.glosario.map((t) => lower(t.termino)))).toEqual([]);
    expect(duplicates(content.glosario.map((t) => lower(t.equivalente_ingles)))).toEqual([]);
    const official = content.glosario.filter((t) => t.fuente.ref === 'ifrs-taxonomia-pymes-es');
    expect(official.length).toBeGreaterThanOrEqual(25);
    for (const t of official) expect(t.fuente.seccion, t.id).toMatch(/NIIF para las PYMES/);
  });

  it('every subject of the catalog has exactly one syllabus and every syllabus belongs to a subject', () => {
    expect(content.materias.length).toBe(31);
    expect(content.temarios.length).toBe(content.materias.length);
    for (const { file, data } of content.temarios) {
      expect(file).toBe(`${data.materia}.json`);
      expect(materiaIds.has(data.materia), data.materia).toBe(true);
    }
    for (const m of content.materias) expect(existsSync(join(CONTENT_ROOT, 'temarios', `${m.id}.json`)), m.id).toBe(true);
  });

  it('subjects link only to existing tools and keep a unique order', () => {
    for (const m of content.materias) {
      for (const tool of m.herramientas) expect(toolIds.has(tool), `${m.id} → ${tool}`).toBe(true);
    }
    expect(duplicates(content.materias.map((m) => String(m.orden)))).toEqual([]);
  });

  it('subtopics only reference existing formulas', () => {
    for (const { data } of content.temarios) {
      for (const tema of data.temas) {
        for (const subtema of tema.subtemas) {
          for (const f of subtema.formulas) expect(formulaIds.has(f), `${subtema.id} → ${f}`).toBe(true);
        }
      }
    }
  });

  it('exercises point to existing subjects, subtopics and formulas', () => {
    expect(content.ejercicios.length).toBeGreaterThanOrEqual(20);
    for (const e of content.ejercicios) {
      expect(materiaIds.has(e.materia), `${e.id} → ${e.materia}`).toBe(true);
      if (e.subtema) expect(subtemaIds.has(e.subtema), `${e.id} → ${e.subtema}`).toBe(true);
      if (e.formula) expect(formulaIds.has(e.formula), `${e.id} → ${e.formula}`).toBe(true);
    }
  });

  it('formulas, apps and templates are linked to existing subjects', () => {
    const links = [
      ...content.formulas.flatMap((f) => f.materias.map((m) => [f.id, m])),
      ...content.apps.flatMap((a) => a.materias.map((m) => [a.id, m])),
      ...content.plantillas.flatMap((p) => p.materias.map((m) => [p.id, m])),
    ];
    const broken = links.filter(([, m]) => !materiaIds.has(m as string));
    expect(broken).toEqual([]);
  });

  it('variables used by the examples are declared by the formula', () => {
    for (const f of content.formulas) {
      const declared = new Set(f.variables.map((v) => v.nombre));
      if (f.calculo.incognita) expect(declared.has(f.calculo.incognita), f.id).toBe(true);
      for (const key of Object.keys(f.ejemplo.entradas)) expect(declared.has(key), `${f.id}.${key}`).toBe(true);
    }
  });

  it('pending records are never mixed with verified ones in the same id space', () => {
    const pending = content.formulas.filter((f) => f.estado === 'pendiente');
    for (const f of pending) {
      const usedBySubtopic = content.temarios.some((t) => t.data.temas.some((tema) => tema.subtemas.some((s) => s.formulas.includes(f.id))));
      expect(usedBySubtopic, `${f.id} está pendiente pero se usa en un subtema`).toBe(false);
    }
  });

  it('every subject, topic and subtopic has theory, and every subtopic a worked example', () => {
    for (const m of content.materias) expect(m.descripcion.length, m.id).toBeGreaterThan(20);
    for (const { data } of content.temarios) {
      for (const tema of data.temas) {
        expect(tema.descripcion.length, tema.id).toBeGreaterThan(20);
        expect(tema.subtemas.length, tema.id).toBeGreaterThan(0);
        for (const s of tema.subtemas) {
          expect(s.explicacion.length, `${s.id} teoría`).toBeGreaterThanOrEqual(80);
          expect(s.ejemplo.length, `${s.id} ejemplo`).toBeGreaterThanOrEqual(60);
          expect(s.ejemplo, `${s.id}: el ejemplo no repite la teoría`).not.toBe(s.explicacion);
        }
      }
    }
  });

  it('every subject offers at least one in-app tool and one verified external technology', () => {
    for (const m of content.materias) {
      expect(m.herramientas.length, m.id).toBeGreaterThan(0);
      expect(content.apps.some((a) => a.materias.includes(m.id)), `${m.id} sin app externa`).toBe(true);
    }
  });

  it('careers reference catalog subjects with coherent cycles and plan counts', () => {
    expect(duplicates(content.carreras.map((c) => c.id))).toEqual([]);
    expect(content.carreras.length).toBeGreaterThanOrEqual(7);
    for (const c of content.carreras) {
      expect(duplicates(c.materias.map((e) => e.materia)), c.id).toEqual([]);
      for (const e of c.materias) {
        const where = `${c.id}/${e.materia}`;
        expect(materiaIds.has(e.materia), where).toBe(true);
        expect(e.ciclo, where).toBeLessThanOrEqual(c.ciclos);
        expect(e.ciclos.includes(e.ciclo), where).toBe(true);
        expect(e.ciclos.every((x) => x >= 1 && x <= c.ciclos), where).toBe(true);
        expect([...e.ciclos].sort((a, b) => a - b), where).toEqual(e.ciclos);
        // Only subjects present in at least half of the career's plans are listed.
        expect(e.planes * 2, where).toBeGreaterThanOrEqual(c.planes);
        expect(e.planes, where).toBeLessThanOrEqual(c.planes);
      }
    }
    // Every subject of the catalog belongs to at least one career.
    const used = new Set(content.carreras.flatMap((c) => c.materias.map((e) => e.materia)));
    expect([...materiaIds].filter((id) => !used.has(id))).toEqual([]);
  });

  it('no university curricula, names or brands are published in the content', () => {
    const forbidden = /\bmallas?\b|universidad de cuenca|\bucuenca\b|\bucacue\b|cat[oó]lica de cuenca|plan(?:es)? de estudios? de la/i;
    const hits = allContentText()
      .map(({ file, text }) => ({ file, match: forbidden.exec(text)?.[0] }))
      .filter((h) => h.match);
    expect(hits).toEqual([]);
  });

  it('the arithmetic written in examples, formula steps and exercise procedures adds up', () => {
    const texts: [string, string][] = [
      ...content.temarios.flatMap(({ data }) =>
        data.temas.flatMap((tema) =>
          tema.subtemas.flatMap((s) => [
            [`subtema ${s.id} (ejemplo)`, s.ejemplo] as [string, string],
            [`subtema ${s.id} (teoría)`, s.explicacion] as [string, string],
          ]),
        ),
      ),
      ...content.formulas.flatMap((f) => f.ejemplo.pasos.map((p) => [`fórmula ${f.id}`, p] as [string, string])),
      ...content.ejercicios.flatMap((e) => e.procedimiento.map((p) => [`ejercicio ${e.id}`, p] as [string, string])),
    ];
    const problems = texts.flatMap(([where, text]) =>
      checkArithmetic(text).map((i) => `${where}: ${i.expresion} (da ${i.calculado})`),
    );
    expect(problems).toEqual([]);
  });
});

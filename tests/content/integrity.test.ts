import { describe, expect, it } from 'vitest';
import { matchesSubject } from '../../src/domain/text/normalize';
import { loadAllContent } from './load-content';

const content = loadAllContent();
const allSubjects = content.mallas.flatMap((m) => m.data.asignaturas.map((a) => ({ ...a, carrera: m.data.carrera })));
const subjectIds = new Set(allSubjects.map((a) => a.id));
const formulaIds = new Set(content.formulas.map((f) => f.id));
const subtemaIds = new Set(content.temarios.flatMap((t) => t.data.temas.flatMap((tema) => tema.subtemas.map((s) => s.id))));

function duplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  return ids.filter((id) => (seen.has(id) ? true : (seen.add(id), false)));
}

describe('integridad del contenido', () => {
  it('identifiers are unique in every collection', () => {
    expect(duplicates(content.fuentes.map((f) => f.id))).toEqual([]);
    expect(duplicates(content.carreras.map((c) => c.id))).toEqual([]);
    expect(duplicates(allSubjects.map((a) => a.id))).toEqual([]);
    expect(duplicates(content.formulas.map((f) => f.id))).toEqual([]);
    expect(duplicates(content.ejercicios.map((e) => e.id))).toEqual([]);
    expect(duplicates(content.apps.map((a) => a.id))).toEqual([]);
    expect(duplicates(content.glosario.map((t) => t.id))).toEqual([]);
    expect(duplicates(content.plantillas.map((p) => p.id))).toEqual([]);
    const temaIds = content.temarios.flatMap((t) => t.data.temas.map((tema) => tema.id));
    expect(duplicates(temaIds)).toEqual([]);
    expect(duplicates(content.temarios.flatMap((t) => t.data.temas.flatMap((tema) => tema.subtemas.map((s) => s.id))))).toEqual([]);
  });

  it('13 careers, each with its curriculum file and the official subject count', () => {
    expect(content.carreras).toHaveLength(13);
    for (const carrera of content.carreras) {
      const malla = content.mallas.find((m) => m.data.carrera === carrera.id);
      expect(malla, carrera.id).toBeDefined();
      expect(malla?.file).toBe(`${carrera.id}.json`);
      expect(malla?.data.asignaturas.length, carrera.id).toBe(carrera.asignaturas_listadas);
      expect(content.universidades.some((u) => u.id === carrera.universidad), carrera.id).toBe(true);
      const cycles = new Set(malla?.data.asignaturas.map((a) => a.ciclo));
      expect(cycles.size, carrera.id).toBe(carrera.num_ciclos);
      for (const a of malla?.data.asignaturas ?? []) {
        expect(a.id.startsWith(`${carrera.id}--c${a.ciclo}-`), a.id).toBe(true);
      }
    }
  });

  it('deep content belongs to real subjects', () => {
    expect(content.temarios.length).toBeGreaterThanOrEqual(5);
    for (const { file, data } of content.temarios) {
      expect(file).toBe(`${data.asignatura}.json`);
      expect(subjectIds.has(data.asignatura), data.asignatura).toBe(true);
      for (const tema of data.temas) {
        for (const subtema of tema.subtemas) {
          for (const f of subtema.formulas) expect(formulaIds.has(f), `${subtema.id} → ${f}`).toBe(true);
        }
      }
    }
  });

  it('exercises point to existing subjects, subtopics and formulas', () => {
    expect(content.ejercicios.length).toBeGreaterThanOrEqual(20);
    expect(content.ejercicios.length).toBeLessThanOrEqual(30);
    for (const e of content.ejercicios) {
      expect(subjectIds.has(e.asignatura), `${e.id} → ${e.asignatura}`).toBe(true);
      if (e.subtema) expect(subtemaIds.has(e.subtema), `${e.id} → ${e.subtema}`).toBe(true);
      if (e.formula) expect(formulaIds.has(e.formula), `${e.id} → ${e.formula}`).toBe(true);
    }
  });

  it('every subject key used by formulas, apps and templates matches at least one real subject', () => {
    const keys = new Set([
      ...content.formulas.flatMap((f) => f.aparece_en),
      ...content.apps.flatMap((a) => a.aparece_en),
      ...content.plantillas.flatMap((p) => p.aparece_en),
    ]);
    const unmatched = [...keys].filter((key) => !allSubjects.some((a) => matchesSubject(a.nombre, key)));
    expect(unmatched).toEqual([]);
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
});

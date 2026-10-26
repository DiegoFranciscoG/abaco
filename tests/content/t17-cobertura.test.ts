import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { careerCoverage, ESTANDAR, materiaCoverage, type CoverageReport } from '../../src/domain/content/coverage';
import { coverageMarkdown } from '../../src/domain/content/coverage-report';
import { repeticionFileSchema } from '../../src/domain/content/schemas';
import { CONTENT_ROOT, loadAllContent } from './load-content';

const content = loadAllContent();
const repeticion = repeticionFileSchema.parse(JSON.parse(readFileSync(join(CONTENT_ROOT, 'repeticion.json'), 'utf8')));
const reports = new Map<string, CoverageReport>(
  content.materias.map((m) => {
    const temario = content.temarios.find((t) => t.data.materia === m.id)!.data;
    return [m.id, materiaCoverage(m, temario, content.ejercicios)];
  }),
);

/** T-17: what the panel declares complete is really complete, and the rest says how far it is. */
describe('T-17: cobertura declarada', () => {
  it('a subject is declared complete only when it meets the depth standard, and the other way round', () => {
    const wrong = content.materias
      .filter((m) => (m.cobertura.estado === 'completa') !== reports.get(m.id)!.cumple)
      .map((m) => `${m.id}: declarada «${m.cobertura.estado}» pero ${reports.get(m.id)!.cumple ? 'cumple' : `falta: ${reports.get(m.id)!.faltantes.join(' ')}`}`);
    expect(wrong).toEqual([]);
  });

  it('measures the standard from the content: units, topics per unit and exercises per calculated topic', () => {
    const t = content.temarios.find((x) => x.data.materia === 'contabilidad-general')!.data;
    const r = reports.get('contabilidad-general')!;
    expect(r.unidades).toBe(t.temas.length);
    expect(r.subtemas).toBe(t.temas.reduce((n, tema) => n + tema.subtemas.length, 0));
    const short = { ...t, temas: t.temas.slice(0, 2) };
    expect(materiaCoverage({ id: 'x', nombre: 'X' }, short, []).faltantes[0]).toMatch(/^Faltan 3 unidades/);
    expect(ESTANDAR.unidadesMin * ESTANDAR.subtemasPorUnidadMin).toBe(20);
  });

  it('every career lists, cycle by cycle, its subjects and the ones ÁBACO does not cover yet', () => {
    for (const c of content.carreras) {
      const cycles = careerCoverage(c, reports);
      expect(cycles.flatMap((x) => x.materias).length, c.id).toBe(c.materias.length);
      expect(cycles.flatMap((x) => x.pendientes).length, c.id).toBe(c.pendientes?.length ?? 0);
      const names = new Set(content.materias.map((m) => m.nombre.toLocaleLowerCase('es')));
      for (const p of c.pendientes ?? []) expect(names.has(p.nombre.toLocaleLowerCase('es')), `${c.id}: ${p.nombre}`).toBe(false);
    }
  });

  it('the repetition map points to existing subjects and the ones in 3 or more careers are covered', () => {
    const ids = new Set(content.materias.map((m) => m.id));
    for (const r of repeticion) if (r.materia) expect(ids.has(r.materia), r.nombre).toBe(true);
    const repeated = repeticion.filter((r) => r.carreras >= 3 && r.tipo === 'materia');
    expect(repeated.every((r) => r.materia !== null), repeated.filter((r) => !r.materia).map((r) => r.nombre).join(', ')).toBe(true);
  });

  it('docs/cobertura.md is generated from the content and is up to date (npm run cobertura)', () => {
    const doc = readFileSync(join(CONTENT_ROOT, '..', 'docs', 'cobertura.md'), 'utf8');
    expect(doc).toBe(coverageMarkdown({ materias: content.materias, carreras: content.carreras, reports, repeticion }));
  });
});

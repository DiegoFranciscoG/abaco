import { describe, expect, it } from 'vitest';
import { indexFromDocuments, searchContent, suggest } from '../../src/domain/search/content-search';
import { buildSearchDocuments, normalizeTerm } from '../../src/domain/search/index-data';
import { loadAllContent } from '../content/load-content';

const content = loadAllContent();
const docs = buildSearchDocuments({
  universidades: content.universidades,
  carreras: content.carreras,
  mallas: content.mallas.map((m) => m.data),
  temarios: content.temarios.map((t) => t.data),
  formulas: content.formulas,
  glosario: content.glosario,
  apps: content.apps,
  ejercicios: content.ejercicios,
});
const index = indexFromDocuments(docs);

describe('content search', () => {
  it('indexes every kind of content once', () => {
    const ids = docs.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    const kinds = new Set(docs.map((d) => d.tipo));
    expect([...kinds].sort()).toEqual(['app', 'asignatura', 'carrera', 'ejercicio', 'formula', 'subtema', 'termino']);
    expect(docs.filter((d) => d.tipo === 'asignatura')).toHaveLength(588);
  });

  it('normalizes terms (accents, case, stopwords)', () => {
    expect(normalizeTerm('Depreciación')).toBe('depreciacion');
    expect(normalizeTerm('de')).toBeNull();
    expect(normalizeTerm('  ')).toBeNull();
  });

  it('finds formulas by name, acronym and Excel function, in Spanish or English', () => {
    expect(searchContent(index, 'valor actual neto', { types: ['formula'] })[0]?.id).toBe('formula:van');
    expect(searchContent(index, 'VAN', { types: ['formula'] })[0]?.id).toBe('formula:van');
    expect(searchContent(index, 'PAGO', { types: ['formula'] }).map((h) => h.id)).toContain('formula:cuota-prestamo');
    expect(searchContent(index, 'PMT', { types: ['formula'] }).map((h) => h.id)).toContain('formula:cuota-prestamo');
  });

  it('ignores accents and tolerates small typos', () => {
    expect(searchContent(index, 'depreciacion linea recta')[0]?.id).toBe('formula:depreciacion-linea-recta');
    expect(searchContent(index, 'amortisacion', { types: ['formula'] }).length).toBeGreaterThan(0);
  });

  it('finds subjects of both universities and links to their page', () => {
    const hits = searchContent(index, 'matematica financiera', { types: ['asignatura'] });
    expect(hits.length).toBeGreaterThanOrEqual(5);
    expect(hits.every((h) => h.ruta.startsWith('/asignatura/'))).toBe(true);
  });

  it('falls back to any-word matching when all words do not match together', () => {
    expect(searchContent(index, 'iva zzzzzz').length).toBeGreaterThan(0);
  });

  it('ignores one-letter queries and suggests while typing', () => {
    expect(searchContent(index, 'a')).toEqual([]);
    expect(suggest(index, 'deprec').length).toBeGreaterThan(0);
    expect(suggest(index, 'x')).toEqual([]);
  });
});

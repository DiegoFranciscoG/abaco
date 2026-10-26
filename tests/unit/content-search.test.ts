import { describe, expect, it } from 'vitest';
import { indexFromDocuments, searchContent, suggest } from '../../src/domain/search/content-search';
import { buildSearchDocuments, normalizeTerm } from '../../src/domain/search/index-data';
import { TOOLS } from '../../src/domain/tools/catalog';
import { loadAllContent } from '../content/load-content';

const content = loadAllContent();
const docs = buildSearchDocuments({
  materias: content.materias,
  temarios: content.temarios.map((t) => t.data),
  formulas: content.formulas,
  glosario: content.glosario,
  apps: content.apps,
  ejercicios: content.ejercicios,
  herramientas: TOOLS,
});
const index = indexFromDocuments(docs);

describe('content search', () => {
  it('indexes every kind of content once', () => {
    const ids = docs.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    const kinds = new Set(docs.map((d) => d.tipo));
    expect([...kinds].sort()).toEqual([
      'app',
      'ejercicio',
      'formula',
      'herramienta',
      'materia',
      'subtema',
      'tema',
      'termino',
    ]);
    expect(docs.filter((d) => d.tipo === 'materia')).toHaveLength(content.materias.length);
    expect(docs.filter((d) => d.tipo === 'herramienta')).toHaveLength(TOOLS.length);
  });

  it('normalizes terms (accents, case, stopwords)', () => {
    expect(normalizeTerm('Depreciación')).toBe('depreciacion');
    expect(normalizeTerm('de')).toBeNull();
    expect(normalizeTerm('  ')).toBeNull();
  });

  it('finds formulas by name, acronym and Excel function, in Spanish or English', () => {
    expect(searchContent(index, 'valor actual neto', { types: ['formula'] })[0]?.id).toBe('formula:van');
    expect(searchContent(index, 'VAN', { types: ['formula'] })[0]?.id).toBe('formula:van');
    expect(searchContent(index, 'PAGO', { types: ['formula'] }).map((h) => h.id)).toContain(
      'formula:cuota-prestamo',
    );
    expect(searchContent(index, 'PMT', { types: ['formula'] }).map((h) => h.id)).toContain(
      'formula:cuota-prestamo',
    );
  });

  it('ignores accents and tolerates small typos', () => {
    expect(searchContent(index, 'depreciacion linea recta')[0]?.id).toBe('formula:depreciacion-linea-recta');
    expect(searchContent(index, 'amortisacion', { types: ['formula'] }).length).toBeGreaterThan(0);
  });

  it('finds subjects by name or synonym and links to their page', () => {
    expect(searchContent(index, 'matematica financiera', { types: ['materia'] })[0]?.ruta).toBe(
      '/materia/matematica-financiera',
    );
    expect(searchContent(index, 'mercadotecnia', { types: ['materia'] })[0]?.ruta).toBe('/materia/marketing');
  });

  it('finds topics, subtopics and tools', () => {
    expect(
      searchContent(index, 'punto de equilibrio', { types: ['subtema'] }).every((h) =>
        h.ruta.startsWith('/materia/'),
      ),
    ).toBe(true);
    expect(searchContent(index, 'rol de pagos', { types: ['herramienta'] })[0]?.ruta).toBe(
      '/herramientas/rol-pagos',
    );
    expect(searchContent(index, 'latex', { types: ['herramienta'] })[0]?.ruta).toBe('/herramientas/editor');
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

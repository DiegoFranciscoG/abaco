import { describe, expect, it } from 'vitest';
import { filterGlossary, glossaryAreas, glossarySheet } from '../../src/domain/content/glossary';
import { AREAS, type Termino } from '../../src/domain/content/schemas';

const term = (
  id: string,
  termino: string,
  ingles: string,
  areas: Termino['areas'],
  sinonimos: string[] = [],
): Termino => ({
  id,
  termino,
  definicion: `Definición de prueba para ${termino}, con suficiente texto para el esquema.`,
  sinonimos,
  equivalente_ingles: ingles,
  areas,
  fuente: { ref: 'ifrs-taxonomia-pymes-es' },
  actualizado_en: '2026-10-26',
});

const terms = [
  term('plusvalia', 'Plusvalía', 'Goodwill', ['contabilidad'], ['Fondo de comercio']),
  term('ingresos', 'Ingresos de actividades ordinarias', 'Revenue', ['contabilidad']),
  term('wacc', 'Costo promedio ponderado de capital (CPPC)', 'Weighted average cost of capital (WACC)', [
    'finanzas',
  ]),
  term('activo', 'Activo', 'Asset', ['contabilidad']),
];

describe('bilingual glossary', () => {
  it('finds a term by its English name, its Spanish name or a synonym, without accents', () => {
    const base = { area: 'todas', language: 'es' } as const;
    expect(filterGlossary(terms, { ...base, query: 'goodwill' }).map((t) => t.id)).toEqual(['plusvalia']);
    expect(filterGlossary(terms, { ...base, query: 'plusvalia' }).map((t) => t.id)).toEqual(['plusvalia']);
    expect(filterGlossary(terms, { ...base, query: 'fondo de comercio' }).map((t) => t.id)).toEqual([
      'plusvalia',
    ]);
    expect(filterGlossary(terms, { ...base, query: 'WACC' }).map((t) => t.id)).toEqual(['wacc']);
  });

  it('sorts by the leading language and filters by area', () => {
    expect(
      filterGlossary(terms, { query: '', area: 'todas', language: 'es' }).map((t) => t.termino[0]),
    ).toEqual(['A', 'C', 'I', 'P']);
    expect(
      filterGlossary(terms, { query: '', area: 'todas', language: 'en' }).map((t) => t.equivalente_ingles),
    ).toEqual(['Asset', 'Goodwill', 'Revenue', 'Weighted average cost of capital (WACC)']);
    expect(filterGlossary(terms, { query: '', area: 'finanzas', language: 'es' }).map((t) => t.id)).toEqual([
      'wacc',
    ]);
    expect(glossaryAreas(terms, AREAS)).toEqual(['contabilidad', 'finanzas']);
  });

  it('builds a vocabulary sheet headed by the chosen language', () => {
    const es = glossarySheet(
      filterGlossary(terms, { query: 'goodwill', area: 'todas', language: 'es' }),
      'es',
    );
    expect(es).toMatchObject({
      A1: 'Español',
      B1: 'English',
      A2: 'Plusvalía',
      B2: 'Goodwill',
      D2: 'Fondo de comercio',
    });
    const en = glossarySheet(terms.slice(1, 2), 'en');
    expect(en).toMatchObject({
      A1: 'English',
      B1: 'Español',
      A2: 'Revenue',
      B2: 'Ingresos de actividades ordinarias',
    });
    expect(en).not.toHaveProperty('D2');
  });
});

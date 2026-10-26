import { describe, expect, it } from 'vitest';
import {
  foldWithMap,
  pageAt,
  readerWindow,
  searchPdfs,
  SEARCH_LIMITS,
} from '../../src/domain/study/pdf-search';

const pdf = (id: string, texto: string) => ({
  id,
  nombre: `${id}.pdf`,
  materiaId: 'contabilidad-general',
  texto,
});
const paged = pdf(
  'apuntes',
  'Unidad 1\nLa DEPRECIACIÓN reparte el costo.\n\fUnidad 2\nMétodos de depreciación:\nlínea   recta y suma de dígitos.\n\fUnidad 3\nKardex.',
);

describe('búsqueda en los PDF del estudiante', () => {
  it('ignores accents, capitals and line breaks, and keeps the original positions', () => {
    const folded = foldWithMap('Línea\n  RECTA');
    expect(folded.text).toBe('linea recta');
    expect(folded.map[6]).toBe(8);
    const hits = searchPdfs([paged], 'depreciacion');
    expect(hits.map((h) => h.coincidencia)).toEqual(['DEPRECIACIÓN', 'depreciación']);
    expect(paged.texto.slice(hits[0]!.inicio, hits[0]!.fin)).toBe('DEPRECIACIÓN');
    expect(searchPdfs([paged], 'línea recta')[0]?.coincidencia).toBe('línea recta');
  });

  it('says on which page each match is', () => {
    expect(searchPdfs([paged], 'depreciación').map((h) => h.pagina)).toEqual([1, 2]);
    expect(searchPdfs([paged], 'kardex')[0]?.pagina).toBe(3);
    expect(pageAt('sin marcas de página', 5)).toBeNull();
  });

  it('shows context around the match and the whole page in the reader', () => {
    const [hit] = searchPdfs([paged], 'suma de digitos');
    expect(hit?.antes).toContain('línea recta y');
    const { desde, hasta } = readerWindow(paged.texto, hit!);
    expect(paged.texto.slice(desde, hasta)).toBe(
      'Unidad 2\nMétodos de depreciación:\nlínea   recta y suma de dígitos.\n',
    );
    const legacy = pdf('viejo', `${'x '.repeat(2000)}punto de equilibrio${' y'.repeat(2000)}`);
    const [old] = searchPdfs([legacy], 'punto de equilibrio');
    expect(old?.pagina).toBeNull();
    const window = readerWindow(legacy.texto, old!, 100);
    expect(window.hasta - window.desde).toBe(old!.fin - old!.inicio + 200);
  });

  it('needs at least 3 letters and limits the number of results', () => {
    expect(searchPdfs([paged], 'de')).toEqual([]);
    const many = pdf('largo', 'activo '.repeat(500));
    expect(searchPdfs([many], 'activo')).toHaveLength(SEARCH_LIMITS.perPdf);
    const pdfs = Array.from({ length: 8 }, (_, i) => pdf(`p${i}`, 'pasivo '.repeat(20)));
    expect(searchPdfs(pdfs, 'pasivo')).toHaveLength(SEARCH_LIMITS.total);
    expect(searchPdfs([paged], 'no aparece en ningún lado')).toEqual([]);
  });
});

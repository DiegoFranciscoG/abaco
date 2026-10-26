import { normalizeText } from '../text/normalize';
import type { Area, Termino } from './schemas';

export type GlossaryLanguage = 'es' | 'en';

export interface GlossaryFilter {
  query: string;
  area: Area | 'todas';
  /** Which language leads: the heading, the sort order and the first column of the export. */
  language: GlossaryLanguage;
}

const headword = (t: Termino, language: GlossaryLanguage) => (language === 'es' ? t.termino : t.equivalente_ingles);

/** Search matches both languages and the synonyms, so "goodwill" finds "Plusvalía" and "fondo de comercio" too. */
export function filterGlossary(terms: readonly Termino[], filter: GlossaryFilter): Termino[] {
  const q = normalizeText(filter.query);
  const locale = filter.language === 'es' ? 'es' : 'en';
  return terms
    .filter((t) => filter.area === 'todas' || t.areas.includes(filter.area))
    .filter(
      (t) => !q || normalizeText(`${t.termino} ${t.definicion} ${t.sinonimos.join(' ')} ${t.equivalente_ingles}`).includes(q),
    )
    .sort((a, b) => headword(a, filter.language).localeCompare(headword(b, filter.language), locale));
}

/** Areas that actually have terms, in the order the catalog defines them. */
export function glossaryAreas(terms: readonly Termino[], order: readonly Area[]): Area[] {
  const used = new Set(terms.flatMap((t) => t.areas));
  return order.filter((a) => used.has(a));
}

/** A two-language vocabulary sheet the student can print or study from: one row per term, headed by the language chosen. */
export function glossarySheet(terms: readonly Termino[], language: GlossaryLanguage): Record<string, string> {
  const cells: Record<string, string> = language === 'es'
    ? { A1: 'Español', B1: 'English', C1: 'Definición', D1: 'Sinónimos' }
    : { A1: 'English', B1: 'Español', C1: 'Definición', D1: 'Sinónimos' };
  terms.forEach((t, i) => {
    const row = i + 2;
    cells[`A${row}`] = headword(t, language);
    cells[`B${row}`] = language === 'es' ? t.equivalente_ingles : t.termino;
    cells[`C${row}`] = t.definicion;
    if (t.sinonimos.length > 0) cells[`D${row}`] = t.sinonimos.join(', ');
  });
  return cells;
}

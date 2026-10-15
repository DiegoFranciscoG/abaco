import { FUNCTION_CATALOG, type FunctionInfo, type Locale } from '../formula';
import { normalizeText } from '../text/normalize';

export interface FunctionSuggestion {
  info: FunctionInfo;
  /** Name in the sheet's locale. */
  label: string;
  /** Text to insert after the "=" prefix that was typed. */
  insert: string;
}

/** Name of the function being typed at the end of a formula ("=SUMA(A1:A3)+PRO" → "PRO"). */
export function currentFunctionPrefix(formula: string): string | null {
  if (!formula.startsWith('=')) return null;
  const match = /([A-Za-zÀ-ɏ][A-Za-z0-9.À-ɏ]*)$/.exec(formula);
  return match?.[1] ?? null;
}

export function suggestFunctions(formula: string, locale: Locale, limit = 6): FunctionSuggestion[] {
  const prefix = currentFunctionPrefix(formula);
  if (!prefix) return [];
  const needle = normalizeText(prefix).toUpperCase();
  const scored: { s: FunctionSuggestion; score: number }[] = [];
  for (const info of FUNCTION_CATALOG) {
    const label = locale === 'es' ? (info.spanish ?? info.name) : info.name;
    const name = normalizeText(label).toUpperCase();
    const alt = normalizeText(locale === 'es' ? info.name : (info.spanish ?? '')).toUpperCase();
    let score = -1;
    if (name.startsWith(needle)) score = 3;
    else if (alt && alt.startsWith(needle)) score = 2;
    else if (needle.length >= 3 && normalizeText(info.description).toUpperCase().includes(needle)) score = 1;
    if (score > 0) scored.push({ s: { info, label, insert: `${label}(` }, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.s.label.localeCompare(b.s.label))
    .slice(0, limit)
    .map((x) => x.s);
}

/** Replaces the function prefix being typed with the chosen suggestion. */
export function applySuggestion(formula: string, suggestion: FunctionSuggestion): string {
  const prefix = currentFunctionPrefix(formula);
  if (!prefix) return formula;
  return formula.slice(0, formula.length - prefix.length) + suggestion.insert;
}

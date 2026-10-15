/** Lowercase, remove diacritics and collapse whitespace: "Matemáticas  Financieras" -> "matematicas financieras". */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Minimal plural folding used only to match subject names ("matematicas financieras" ~ "matematica financiera").
 * It strips a final "s"; keys in content are written so that this is enough (tests check every key matches).
 */
function singular(word: string): string {
  return word.length > 3 && word.endsWith('s') ? word.slice(0, -1) : word;
}

/** Key used to link formulas, apps and templates to subjects published with slightly different names. */
export function subjectKey(value: string): string {
  return normalizeText(value)
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(' ')
    .filter((w) => w.length > 0)
    .map(singular)
    .join(' ');
}

/** True when every word of `key` appears in `subjectName` (after normalization). */
export function matchesSubject(subjectName: string, key: string): boolean {
  const haystack = ` ${subjectKey(subjectName)} `;
  const needle = subjectKey(key);
  if (needle.length === 0) return false;
  return haystack.includes(` ${needle} `);
}

export function slugify(value: string): string {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

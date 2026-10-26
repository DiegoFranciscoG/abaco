import type { AcademicResult, Author } from './types';

const SPANISH_LIKE = new Set(['es', 'spa', 'pt', 'por']);
const PARTICLES = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'da', 'do', 'dos', 'das', 'van', 'von']);

/**
 * Splits a full name into given names and surnames. Hispanic names usually carry two surnames, so for
 * Spanish/Portuguese works a 3–4 word name keeps the last two words as surnames. This is a heuristic: the
 * interface tells the student to review generated citations.
 */
export function splitName(full: string, language?: string): { given: string; family: string } {
  const clean = full.replace(/\s+/g, ' ').trim();
  if (clean.includes(',')) {
    const [family = '', given = ''] = clean.split(',').map((p) => p.trim());
    return { given, family };
  }
  const words = clean.split(' ');
  if (words.length === 1) return { given: '', family: clean };
  const spanish = language ? SPANISH_LIKE.has(language.toLowerCase()) : false;
  let familyCount = 1;
  if (spanish && words.length >= 3) familyCount = 2;
  let start = words.length - familyCount;
  while (start > 1 && PARTICLES.has((words[start - 1] ?? '').toLowerCase())) start -= 1;
  return { given: words.slice(0, start).join(' '), family: words.slice(start).join(' ') };
}

/** "Juan Carlos" → "J. C."; "María-José" → "M.-J." */
export function initials(given: string): string {
  return given
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      word
        .split('-')
        .map((part) => (part[0] ? `${part[0].toUpperCase()}.` : ''))
        .join('-'),
    )
    .join(' ');
}

export function formatAuthor(author: Author, language?: string): string {
  const parts = author.family
    ? { given: author.given ?? '', family: author.family }
    : splitName(author.full ?? '', language);
  if (!parts.family) return '';
  const init = initials(parts.given);
  return init ? `${parts.family}, ${init}` : parts.family;
}

/** APA 7: up to 20 authors listed; with 21 or more, the first 19, an ellipsis and the last one. */
export function formatAuthorList(authors: Author[], language?: string): string {
  const names = authors.map((a) => formatAuthor(a, language)).filter(Boolean);
  if (names.length === 0) return '';
  if (names.length === 1) return names[0] as string;
  if (names.length > 20) return `${names.slice(0, 19).join(', ')}, … ${names[names.length - 1]}`;
  return `${names.slice(0, -1).join(', ')}, & ${names[names.length - 1]}`;
}

const endWithPeriod = (text: string): string => (/[.?!]$/.test(text) ? text : `${text}.`);

export interface Citation {
  /** Plain text, ready to paste anywhere. */
  text: string;
  /** Same citation split so the UI can italicize the container. */
  parts: { before: string; italic: string; after: string };
}

export function formatApa(result: AcademicResult): Citation {
  const authors = formatAuthorList(result.authors, result.language);
  const year = result.year ? `(${result.year}).` : '(s. f.).';
  if (result.type === 'webpage') {
    // APA 7 web page: Author, A. A. (Year). *Title*. Site Name. URL (site omitted when it is the author)
    const before = authors ? `${endWithPeriod(authors)} ${year} ` : '';
    const italic = endWithPeriod(result.title.trim());
    const site =
      result.container && result.container !== authors ? ` ${endWithPeriod(result.container)}` : '';
    const after = `${authors ? '' : ` ${year}`}${site} ${result.url}`;
    return {
      text: `${before}${italic}${after}`.replace(/\s+/g, ' ').trim(),
      parts: { before, italic, after },
    };
  }
  if (result.type === 'book') {
    // APA 7 book: Author, A. A. (Year). *Title*. Publisher. URL
    const before = authors ? `${endWithPeriod(authors)} ${year} ` : '';
    const italic = endWithPeriod(result.title.trim());
    const after = `${result.publisher ? ` ${endWithPeriod(result.publisher)}` : ''}${authors ? '' : ` ${year}`} ${result.url}`;
    return {
      text: `${before}${italic}${after}`.replace(/\s+/g, ' ').trim(),
      parts: { before, italic, after },
    };
  }
  const title = endWithPeriod(result.title.trim());
  const head = authors ? `${endWithPeriod(authors)} ${year} ${title}` : `${title} ${year}`;
  let italic = '';
  let after = '';
  if (result.container) {
    italic = result.container;
    if (result.volume) italic += `, ${result.volume}`;
    if (result.issue) after += `(${result.issue})`;
    if (result.pages) after += `, ${result.pages}`;
    after += '.';
  }
  const link = result.doi ? `https://doi.org/${result.doi}` : result.url;
  after += ` ${link}`;
  const before = italic ? `${head} ` : `${head}`;
  return { text: `${before}${italic}${after}`.replace(/\s+/g, ' ').trim(), parts: { before, italic, after } };
}

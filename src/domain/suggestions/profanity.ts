/**
 * Offensive words in Spanish (general use and Ecuador). The list is the project's own selection: it targets insults
 * and vulgarities, not topics, so words that also have a neutral meaning in economics or mathematics ("cono",
 * "concha", "sexo", "violar la ley", "basura") are deliberately left out. Each entry is a regular expression matched
 * against a whole word after normalization (lowercase, no accents, leetspeak undone, repeated letters collapsed), so
 * entries are written with single letters ("gonorea", "zora"); words whose collapsed form is an ordinary word
 * ("perra" → "pera") are excluded.
 */
const OFFENSIVE = [
  'put[ao]s?',
  'putamadre',
  'hijueput[ao]s?',
  'hijodeput[ao]',
  'hdp',
  'hpt[ao]?s?',
  'mierd[ao]s?',
  'mrd',
  'pendej[ao]s?',
  'pendejadas?',
  'cabron(?:a|as|es)?',
  '[hgw]uev[ao]n(?:a|as|es)?',
  'web[ao]n(?:a|as|es)?',
  'verg[ao]s?',
  'vrg',
  'chuchas?',
  'chuchatumadre',
  'conchetumadre',
  'conchatumadre',
  'ctm',
  'maric[ao]s?',
  'maricon(?:es)?',
  'caraj[ao]s?',
  'jod(?:er|ido|ida|idos|idas|ete|anse)',
  'gonoreas?',
  'malparid[ao]s?',
  'imbecil(?:es)?',
  'idiotas?',
  'estupid[ao]s?',
  'culer[ao]s?',
  'culos?',
  'pinches?',
  'ching(?:ar|ada|adas|ado|ados|ue|uen)',
  'mamag[uw]ev[ao]s?',
  'mamagueb[ao]s?',
  'zoras?',
  'cojud[ao]s?',
  'cojudez',
  'longos?',
  'pajer[ao]s?',
  'porno',
  'ptm',
];

const OFFENSIVE_RE = new RegExp(`^(?:${OFFENSIVE.join('|')})$`);

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's' };

/** Lowercase, no accents, leetspeak undone; letters spelled with separators ("p.u.t.a") are joined. */
function profanityTokens(text: string): string[] {
  const base = text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[013457@$]/g, (c) => LEET[c] ?? c);
  const joined = base.replace(/\b(?:[a-z][\s.*_-]){2,}[a-z]\b/g, (m) => m.replace(/[\s.*_-]/g, ''));
  return joined
    .split(/[^a-z]+/)
    .filter((w) => w.length > 1)
    .map((w) => w.replace(/(.)\1+/g, '$1'));
}

/** Offensive words found in the text (normalized form), empty when it is clean. */
export function findOffensive(text: string): string[] {
  return [...new Set(profanityTokens(text).filter((w) => OFFENSIVE_RE.test(w)))];
}

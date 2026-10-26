/**
 * "Pega tu enunciado": finds which topic, formula and tool a homework statement asks for, without any language
 * model. Two plain layers:
 * 1. Phrases of content/enunciados.json, the way students name things ("tabla de pagos del préstamo"),
 *    matched in order. A phrase is strong evidence.
 * 2. Word overlap with each concept's vocabulary (its phrases plus the names of its subtopics and formulas),
 *    weighted so that rare words count more (BM25). It is weak evidence and never gives a confident answer.
 * When nothing matches, or two topics tie, the answer says so instead of guessing.
 */
import type { Concepto } from '../content/schemas';
import { normalizeText } from '../text/normalize';

/** Words that carry no meaning on their own. "si", "no", "ni" and "sin" are kept: "función SI", "sin causa". */
const STOPWORDS = new Set([
  'a',
  'al',
  'ante',
  'con',
  'de',
  'del',
  'e',
  'el',
  'en',
  'es',
  'la',
  'las',
  'le',
  'les',
  'lo',
  'los',
  'me',
  'mi',
  'o',
  'para',
  'por',
  'que',
  'se',
  'son',
  'su',
  'sus',
  'te',
  'tu',
  'u',
  'un',
  'una',
  'unas',
  'unos',
  'y',
  'cada',
  'este',
  'esta',
  'estos',
  'estas',
  'ese',
  'esa',
]);

/** Instruction verbs and filler of homework statements: they say what to do, not about what. */
const TASK_WORDS = new Set(
  [
    'calcule',
    'calcular',
    'determine',
    'determinar',
    'elabore',
    'elaborar',
    'explique',
    'explicar',
    'realice',
    'prepare',
    'presente',
    'halle',
    'encuentre',
    'indique',
    'analice',
    'interprete',
    'resuelva',
    'cuanto',
    'cual',
    'como',
    'datos',
    'siguiente',
    'siguientes',
    'empresa',
    'ano',
    'anos',
    'mes',
    'meses',
  ].map((w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w)),
);

/** A phrase word may skip at most this many words of the statement after the previous one. */
const MAX_GAP = 2;
/** Fewer content words than this is not a statement yet. */
export const MIN_WORDS = 3;

/** Plural folding shared by statements and phrases: "costos" and "costo" are the same word. */
function fold(word: string): string {
  return word.length > 3 && word.endsWith('s') ? word.slice(0, -1) : word;
}

/** Content words of a text, normalized (no accents, lowercase) and without stopwords. */
export function contentWords(text: string): string[] {
  return normalizeText(text)
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .split(' ')
    .filter((w) => w.length > 0 && !STOPWORDS.has(w))
    .map(fold);
}

interface PhraseWord {
  prefix: boolean;
  value: string;
}

function phraseWords(phrase: string): PhraseWord[] {
  return normalizeText(phrase)
    .split(' ')
    .filter((w) => w.length > 0 && !STOPWORDS.has(w.replace(/\*$/, '')))
    .map((w) =>
      w.endsWith('*') ? { prefix: true, value: w.slice(0, -1) } : { prefix: false, value: fold(w) },
    );
}

const wordMatches = (word: string, p: PhraseWord): boolean =>
  p.prefix ? word.startsWith(p.value) : word === p.value;

/** Index of the first statement word where the phrase matches in order (with small gaps), or -1. */
export function findPhrase(words: readonly string[], phrase: string): number {
  const pw = phraseWords(phrase);
  if (pw.length === 0) return -1;
  for (let start = 0; start < words.length; start += 1) {
    if (!wordMatches(words[start] ?? '', pw[0]!)) continue;
    let last = start;
    let ok = true;
    for (let j = 1; j < pw.length && ok; j += 1) {
      let found = -1;
      for (let k = last + 1; k <= Math.min(words.length - 1, last + 1 + MAX_GAP); k += 1) {
        if (wordMatches(words[k] ?? '', pw[j]!)) {
          found = k;
          break;
        }
      }
      if (found === -1) ok = false;
      else last = found;
    }
    if (ok) return start;
  }
  return -1;
}

export interface SubtemaRef {
  id: string;
  nombre: string;
  materia: string;
  ruta: string;
}

/** Everything the matcher needs: the dictionary plus the names of the subtopics and formulas it points to. */
export interface StatementCatalog {
  conceptos: Concepto[];
  subtemas: Record<string, SubtemaRef>;
  formulas: Record<string, string>;
}

export interface ConceptMatch {
  concepto: Concepto;
  score: number;
  /** Phrases of the dictionary found in the statement, to show why. Empty for word-overlap matches. */
  frases: string[];
  /** The subtopic of the concept that best fits the statement. */
  subtema: SubtemaRef | null;
  /** The concept's main subtopic, when it is not the one above (both are worth studying). */
  principal: SubtemaRef | null;
}

export type Confidence = 'alta' | 'media' | 'baja';

export interface StatementMatch {
  confianza: Confidence;
  /** Best concepts first; empty when nothing matched. */
  opciones: ConceptMatch[];
  /** The statement is too short to say anything. */
  muyCorto: boolean;
}

/** A clear winner leads the next concept by at least this much. */
const CLEAR_LEAD = 0.75;
/** A single matched word is never enough for a confident answer. */
const CONFIDENT_SCORE = 2;
/** Weight of the word-overlap layer next to phrases. */
const LEXICAL_WEIGHT = 0.15;
/** Word overlap alone suggests a topic only above this score and clearly ahead of the next one. */
const LEXICAL_MIN = 7;
const LEXICAL_LEAD = 1.3;
const K1 = 1.2;
const B = 0.5;

interface Vocabulary {
  terms: PhraseWord[];
}

const termKey = (t: PhraseWord): string => `${t.prefix ? '*' : ''}${t.value}`;

export type StatementMatcher = (text: string) => StatementMatch;

/** Precomputes each concept's vocabulary and word weights once; the returned function is cheap to call. */
export function createMatcher(catalog: StatementCatalog): StatementMatcher {
  const vocab = new Map<string, Vocabulary>();
  const docFreq = new Map<string, number>();
  for (const c of catalog.conceptos) {
    const words = new Map<string, PhraseWord>();
    const add = (w: PhraseWord) => {
      if (w.value.length < 3 || TASK_WORDS.has(w.value)) return;
      words.set(termKey(w), w);
    };
    c.frases.forEach((f) => phraseWords(f).forEach(add));
    c.subtemas.forEach((id) =>
      contentWords(catalog.subtemas[id]?.nombre ?? '').forEach((value) => add({ prefix: false, value })),
    );
    c.formulas.forEach((id) =>
      contentWords(catalog.formulas[id] ?? '').forEach((value) => add({ prefix: false, value })),
    );
    vocab.set(c.id, { terms: [...words.values()] });
    for (const key of words.keys()) docFreq.set(key, (docFreq.get(key) ?? 0) + 1);
  }
  const total = catalog.conceptos.length;
  const avgLen = [...vocab.values()].reduce((sum, v) => sum + v.terms.length, 0) / Math.max(1, total);
  const idf = (t: PhraseWord) => {
    const df = docFreq.get(termKey(t)) ?? 0;
    return Math.log(1 + (total - df + 0.5) / (df + 0.5));
  };

  /** BM25 with every matched term counted once (statements are short and repeat little). */
  const lexical = (words: readonly string[], c: Concepto): number => {
    const terms = vocab.get(c.id)?.terms ?? [];
    const norm = (K1 + 1) / (1 + K1 * (1 - B + (B * terms.length) / avgLen));
    return terms.reduce((sum, t) => (words.some((w) => wordMatches(w, t)) ? sum + idf(t) * norm : sum), 0);
  };

  /**
   * The concept's first subtopic is its main one. Another subtopic replaces it only when its name shares at least
   * two more words with the statement ("Prepare el balance de comprobación" → «Balance de comprobación»).
   */
  const bestSubtema = (words: readonly string[], c: Concepto): SubtemaRef | null => {
    const refs = c.subtemas.map((id) => catalog.subtemas[id]).filter((r): r is SubtemaRef => r !== undefined);
    const overlap = (ref: SubtemaRef) =>
      new Set(contentWords(ref.nombre).filter((w) => w.length > 2 && words.includes(w))).size;
    const [main, ...others] = refs;
    if (!main) return null;
    const base = overlap(main);
    let best = main;
    let bestOverlap = base + 1;
    for (const ref of others) {
      const o = overlap(ref);
      if (o > bestOverlap) {
        best = ref;
        bestOverlap = o;
      }
    }
    return best;
  };

  const subtopics = (words: readonly string[], c: Concepto) => {
    const subtema = bestSubtema(words, c);
    const main = catalog.subtemas[c.subtemas[0] ?? ''] ?? null;
    return { subtema, principal: main && main.id !== subtema?.id ? main : null };
  };

  return (text: string): StatementMatch => {
    const words = contentWords(text);
    if (words.length < MIN_WORDS) return { confianza: 'baja', opciones: [], muyCorto: true };

    const scored = catalog.conceptos.map((concepto) => {
      const found = concepto.frases
        .map((frase) => ({ frase, pos: findPhrase(words, frase), size: phraseWords(frase).length }))
        .filter((f) => f.pos >= 0)
        .map((f) => ({ ...f, value: f.size + 0.5 * (1 - f.pos / words.length) }))
        .sort((a, b) => b.value - a.value);
      const [best, ...rest] = found;
      const phrase = best ? best.value + 0.25 * rest.reduce((sum, f) => sum + f.size, 0) : 0;
      const lex = lexical(words, concepto);
      return { concepto, phrase, lex, frases: found.map((f) => f.frase) };
    });

    const withPhrase = scored.filter((s) => s.phrase > 0);
    const round = (n: number) => Math.round(n * 100) / 100;
    if (withPhrase.length > 0) {
      const ranked = withPhrase
        .map((s) => ({ ...s, score: s.phrase + LEXICAL_WEIGHT * s.lex }))
        .sort((a, b) => b.score - a.score || a.concepto.id.localeCompare(b.concepto.id));
      const [first, second] = ranked;
      const clear = !second || first!.score - second.score >= CLEAR_LEAD;
      const confianza: Confidence = first!.phrase >= CONFIDENT_SCORE && clear ? 'alta' : 'media';
      return {
        confianza,
        muyCorto: false,
        opciones: ranked.slice(0, confianza === 'alta' ? 1 : 3).map((s) => ({
          concepto: s.concepto,
          score: round(s.score),
          frases: s.frases,
          ...subtopics(words, s.concepto),
        })),
      };
    }

    const byWords = scored.filter((s) => s.lex > 0).sort((a, b) => b.lex - a.lex);
    const [first, second] = byWords;
    if (first && first.lex >= LEXICAL_MIN && (!second || first.lex >= LEXICAL_LEAD * second.lex)) {
      return {
        confianza: 'media',
        muyCorto: false,
        opciones: byWords.slice(0, 3).map((s) => ({
          concepto: s.concepto,
          score: round(LEXICAL_WEIGHT * s.lex),
          frases: [],
          ...subtopics(words, s.concepto),
        })),
      };
    }
    return { confianza: 'baja', opciones: [], muyCorto: false };
  };
}

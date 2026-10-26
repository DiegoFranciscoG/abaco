import type { Materia, Temario } from '../content/schemas';

// Kept free of runtime imports (like search/index-data.ts) so `node scripts/pdf-analizar.ts` can load it directly.
const normalizeText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Plain-text analysis of a study PDF: no network, no AI, only rules that can be tested. It finds sentences and
 * definitions, measures how much the text matches a subject of the catalog and flags personal data.
 */

/** Joins words split across lines ("contabi-\nlidad"), and collapses whitespace. */
export function cleanPdfText(raw: string): string {
  return raw
    .replace(/(\p{L})-\s*\n\s*(\p{Ll})/gu, '$1$2')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

/** Sentences of reasonable length (40 to 320 characters), in order. */
export function splitSentences(text: string): string[] {
  const lines = cleanPdfText(text).split('\n');
  // A short line without final punctuation followed by a capitalized line is a heading: close it as a sentence.
  const joined = lines
    .map((line, i) => {
      const next = lines[i + 1] ?? '';
      const heading = line.length < 60 && !/[.!?,;:]$/.test(line) && /^[¿¡«"“(]?\p{Lu}/u.test(next);
      return heading ? `${line}.` : line;
    })
    .join(' ');
  return joined
    .split(/(?<=[.!?])\s+(?=[¿¡«"“(]?\p{Lu})/u)
    .map((s) => s.trim())
    .filter((s) => s.length >= 40 && s.length <= 320);
}

export interface Definition {
  termino: string;
  definicion: string;
  oracion: string;
}

const DEFINITION_RE =
  /^(?:(?:el|la|los|las|un|una)\s+)?([\p{L}][\p{L}\s()/-]{2,58}?)\s+(es|son|se define como|se denomina|consiste en|significa|se entiende por|se refiere a)\s+(.{25,})$/iu;

/** Sentences shaped like «X es …», «X se define como …»: the raw material for cards and quiz questions. */
export function findDefinitions(sentences: string[], max = 80): Definition[] {
  const seen = new Set<string>();
  const out: Definition[] = [];
  for (const oracion of sentences) {
    const m = DEFINITION_RE.exec(oracion);
    if (!m) continue;
    const termino = (m[1] ?? '').trim().replace(/\s+/g, ' ');
    const words = termino.split(' ').length;
    const key = normalizeText(termino);
    if (words > 6 || key.length < 3 || seen.has(key)) continue;
    // Pronouns, demonstratives and clauses («Si ese aporte…», «Este método…») are not terms worth studying.
    if (/^(esto|esta|este|eso|ello|que|lo cual|cual|todo|nada|aqui|alli|hoy)$/.test(key)) continue;
    if (
      /^(si|cuando|aunque|porque|como|pero|ya|tambien|no|y|o|en|con|por|para|de|del|al|se|lo|le|cada|otro|otra)\b/.test(
        key,
      )
    )
      continue;
    if (/\b(ese|esa|esos|esas|este|esta|estos|estas|esto|aquel|aquella|su|sus)\b/.test(key)) continue;
    seen.add(key);
    const definicion = `${m[2]} ${m[3]}`.replace(/\s+/g, ' ').trim();
    out.push({ termino: termino.charAt(0).toUpperCase() + termino.slice(1), definicion, oracion });
    if (out.length >= max) break;
  }
  return out;
}

const STOP = new Set(
  'para como entre sobre desde hasta cuando donde porque tambien mientras segun cada todo todos toda todas otra otro otros otras mismo misma este esta estos estas ese esa esos esas aquel muy mas menos puede pueden debe deben tiene tienen hace hacen solo cual cuales quien quienes ademas tanto tanta durante antes despues siempre nunca entonces asi'.split(
    ' ',
  ),
);

const tokens = (text: string): string[] =>
  normalizeText(text)
    .split(/[^a-z0-9ñ]+/)
    .filter((w) => w.length >= 5 && !STOP.has(w));

/** Characteristic words of each subtopic: its name and key points. */
export function subjectVocabulary(
  materia: Materia,
  temario: Temario,
): { subtemaId: string; nombre: string; palabras: string[] }[] {
  return temario.temas.flatMap((tema) =>
    tema.subtemas.map((s) => ({
      subtemaId: s.id,
      nombre: s.nombre,
      palabras: [
        ...new Set([...tokens(s.nombre), ...s.puntos_clave.flatMap(tokens), ...tokens(materia.nombre)]),
      ],
    })),
  );
}

export interface Relevance {
  /** Share of the subject's vocabulary found in the text, 0 to 1. */
  puntaje: number;
  /** Subtopics whose words appear most, best first. */
  subtemas: { subtemaId: string; nombre: string; coincidencias: number }[];
}

export function subjectRelevance(text: string, materia: Materia, temario: Temario): Relevance {
  const present = new Set(tokens(text));
  const vocab = subjectVocabulary(materia, temario);
  const all = new Set(vocab.flatMap((v) => v.palabras));
  const found = [...all].filter((w) => present.has(w)).length;
  const subtemas = vocab
    .map((v) => ({
      subtemaId: v.subtemaId,
      nombre: v.nombre,
      coincidencias: v.palabras.filter((w) => present.has(w)).length,
    }))
    .filter((v) => v.coincidencias >= 2)
    .sort((a, b) => b.coincidencias - a.coincidencias);
  return { puntaje: all.size === 0 ? 0 : found / all.size, subtemas };
}

/** Counts of personal data patterns (LOPDP art. 10 e): a study document should not carry them. */
export function personalDataCounts(text: string): { cedulas: number; telefonos: number; correos: number } {
  const count = (re: RegExp) => (text.match(re) ?? []).length;
  return {
    cedulas: count(/\b\d{10}(?:001)?\b|\b\d{9}-\d\b/g),
    telefonos: count(/(?:\+593[\s-]?|\b0)9\d[\s-]?\d{3}[\s-]?\d{4}\b/g),
    correos: count(/[^\s@]+@[^\s@]+\.[a-z]{2,}/gi),
  };
}

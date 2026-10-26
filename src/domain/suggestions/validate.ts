import { findOffensive } from './profanity';

/**
 * Validation of the suggestion box. It cannot prove that a suggestion is true, but it filters what is clearly not a
 * suggestion (insults, keyboard mashing, repeated words, spam links) and what should never be sent (personal data,
 * LOPDP art. 10 e: minimization). Corrections must name the source that backs them.
 */
export const SUGGESTION_KINDS = [
  { id: 'materia', label: 'Agregar una materia, tema o subtema' },
  { id: 'herramienta', label: 'Una herramienta o función nueva' },
  { id: 'correccion', label: 'Corregir un contenido' },
  { id: 'error', label: 'Algo no funciona' },
  { id: 'otra', label: 'Otra idea para mejorar ÁBACO' },
] as const;
export type SuggestionKind = (typeof SUGGESTION_KINDS)[number]['id'];

export const MESSAGE_MIN = 30;
export const MESSAGE_MAX = 1000;
export const SOURCE_MAX = 300;

export interface SuggestionInput {
  tipo: string;
  materia: string;
  mensaje: string;
  fuente: string;
  consentimiento: boolean;
  /** Hidden field: people never fill it, simple bots do. */
  trampa: string;
}

export interface Suggestion {
  tipo: SuggestionKind;
  materia: string | null;
  mensaje: string;
  fuente: string | null;
}

export type SuggestionErrors = Partial<Record<'tipo' | 'materia' | 'mensaje' | 'fuente' | 'consentimiento' | 'form', string>>;

export type ValidationResult = { ok: true; value: Suggestion } | { ok: false; errors: SuggestionErrors };

// Most frequent Spanish function words; real sentences always contain some of them.
const STOPWORDS = new Set(
  (
    'a al algo algun alguna ante antes aqui asi aun bien cada casi como con contra cual cuando de del desde donde dos e ' +
    'el ella en entre era es esa ese eso esta este esto estos fue ha hay hace hacer han hasta la las le les lo los mas ' +
    'me mi mis muy ni no nos o otra otro para pero poco por porque puede pueden que se sea ser si sin sobre solo son su ' +
    'sus tal tambien te tiene tienen todo todos tu un una uno unos unas y ya yo falta faltan seria gustaria podrian ' +
    'deberia quisiera'
  ).split(' '),
);

const KEYBOARD_ROWS = ['qwertyuiop', 'asdfghjklñ', 'zxcvbnm', '1234567890'];
const KEYBOARD_RUNS = KEYBOARD_ROWS.flatMap((row) => {
  const runs: string[] = [];
  for (let i = 0; i + 4 <= row.length; i++) {
    const run = row.slice(i, i + 4);
    runs.push(run, [...run].reverse().join(''));
  }
  return runs;
});

const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-̂̄-ͯ]/g, '')
    .normalize('NFC')
    .toLowerCase();

const words = (text: string) => fold(text).match(/[a-zñ]+/g) ?? [];

function badWord(word: string): boolean {
  if (word.length < 4) return false;
  if (!/[aeiouy]/.test(word)) return true;
  if (/[^aeiouy]{5,}/.test(word)) return true;
  if (/(.)\1\1/.test(word)) return true;
  return KEYBOARD_RUNS.some((run) => word.includes(run));
}

/** Reason why the text does not read as a sentence in Spanish, or null when it does. */
export function nonsenseReason(text: string): string | null {
  const all = words(text);
  if (all.length < 6) return 'Escribe al menos una frase completa (seis palabras o más).';
  const long = all.filter((w) => w.length >= 4);
  if (long.length > 0 && long.filter(badWord).length / long.length > 0.3) return 'No logro entender el mensaje. Escríbelo con frases completas en español.';
  if (/([a-zñ])\1{3,}/.test(fold(text))) return 'Hay letras repetidas muchas veces seguidas.';
  const counts = new Map<string, number>();
  for (const w of all) counts.set(w, (counts.get(w) ?? 0) + 1);
  const top = Math.max(...counts.values());
  if (all.length >= 8 && top / all.length > 0.35) return 'El mensaje repite demasiado la misma palabra.';
  if (all.length >= 10 && counts.size / all.length < 0.4) return 'El mensaje repite demasiado las mismas palabras.';
  const stop = all.filter((w) => STOPWORDS.has(w)).length;
  if (stop === 0 || (all.length >= 15 && stop / all.length < 0.1)) return 'Escribe tu sugerencia con frases completas en español.';
  const letters = fold(text).replace(/[^a-zñ]/g, '');
  const vowels = letters.replace(/[^aeiou]/g, '').length;
  if (letters.length >= 30 && (vowels / letters.length < 0.28 || vowels / letters.length > 0.7)) return 'No logro entender el mensaje. Escríbelo con frases completas en español.';
  return null;
}

/** Personal data that a suggestion never needs (LOPDP art. 10 e). */
export function personalDataReason(text: string): string | null {
  if (/[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(text)) return 'No incluyas correos electrónicos: no hacen falta para la sugerencia.';
  const phone = /(?:\+593[\s-]?|\b0)9\d[\s-]?\d{3}[\s-]?\d{4}\b|\b0[2-7][\s-]?\d{3}[\s-]?\d{4}\b/;
  const id = /\b\d{10}(?:001)?\b|\b\d{9}-\d\b/;
  if (phone.test(text) || id.test(text)) return 'No incluyas cédulas, RUC ni teléfonos: no hacen falta para la sugerencia.';
  return null;
}

const URL_RE = /\b(?:https?:\/\/|www\.)\S+/i;

export function validateSuggestion(input: SuggestionInput, materiaIds: ReadonlySet<string>): ValidationResult {
  const errors: SuggestionErrors = {};
  if (input.trampa.trim() !== '') return { ok: false, errors: { form: 'No se pudo preparar el mensaje.' } };

  const kind = SUGGESTION_KINDS.find((k) => k.id === input.tipo);
  if (!kind) errors.tipo = 'Elige de qué trata tu sugerencia.';

  const materia = input.materia.trim();
  if (materia && !materiaIds.has(materia)) errors.materia = 'Elige una materia de la lista.';
  if (kind?.id === 'correccion' && !materia) errors.materia = 'Indica en qué materia está el contenido que hay que corregir.';

  const mensaje = input.mensaje.trim().replace(/[ \t]+/g, ' ');
  const mensajeError =
    mensaje.length < MESSAGE_MIN
      ? `Cuéntame un poco más: al menos ${MESSAGE_MIN} caracteres.`
      : mensaje.length > MESSAGE_MAX
        ? `El mensaje puede tener hasta ${MESSAGE_MAX} caracteres.`
        : findOffensive(mensaje).length > 0
          ? 'Tu mensaje tiene palabras ofensivas. Escríbelo con respeto y lo leeré con gusto.'
          : URL_RE.test(mensaje)
            ? 'Pon los enlaces en el campo «Fuente», no en el mensaje.'
            : (personalDataReason(mensaje) ?? nonsenseReason(mensaje));
  if (mensajeError) errors.mensaje = mensajeError;

  const fuente = input.fuente.trim();
  const fuenteError =
    kind?.id === 'correccion' && fuente.length < 5
      ? 'Para corregir un contenido, indica la norma, el libro o la página oficial que respalda el cambio.'
      : fuente.length > SOURCE_MAX
        ? `La fuente puede tener hasta ${SOURCE_MAX} caracteres.`
        : fuente && findOffensive(fuente).length > 0
          ? 'La fuente tiene palabras ofensivas.'
          : fuente && /\bhttp:\/\//i.test(fuente)
            ? 'Usa un enlace seguro (https://).'
            : fuente
              ? personalDataReason(fuente)
              : null;
  if (fuenteError) errors.fuente = fuenteError;

  if (!input.consentimiento) errors.consentimiento = 'Para enviar, acepta que el titular reciba tu mensaje y tu correo.';

  if (Object.keys(errors).length > 0 || !kind) return { ok: false, errors };
  return { ok: true, value: { tipo: kind.id, materia: materia || null, mensaje, fuente: fuente || null } };
}

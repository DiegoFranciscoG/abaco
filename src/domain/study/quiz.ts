import type { Ejercicio, Materia, Temario } from '../content/schemas';
import { normalizeText } from '../text/normalize';
import type { Definition } from './analyze';

/**
 * Practice exams and flashcards built from ÁBACO's own content (theory, examples, key points, common mistakes and
 * exercises of a subject) and, optionally, from the definitions found in the student's PDF. Questions are
 * built from plain rules, so every correct answer comes from a verified text, never from guessing.
 */
export type ExamSource = 'abaco' | 'pdf' | 'mixto';

interface BaseQuestion {
  id: string;
  enunciado: string;
  /** Text shown above the question (an example, a definition). */
  contexto?: string;
  explicacion: string;
  origen: 'abaco' | 'pdf';
  /** Route to study the answer in ÁBACO, when it comes from the catalog. */
  ruta?: string;
  /** Subtopic the question practises (to show which ones the student finds hard). */
  subtema?: { id: string; nombre: string };
}

export interface ChoiceQuestion extends BaseQuestion {
  tipo: 'opcion';
  opciones: string[];
  correcta: number;
}

export interface NumberQuestion extends BaseQuestion {
  tipo: 'numero';
  respuesta: number;
  tolerancia: number;
  unidad: string;
}

export type Question = ChoiceQuestion | NumberQuestion;

/** Small deterministic generator (mulberry32) so an exam can be reproduced and tested. */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

const pick = <T>(items: readonly T[], rng: () => number): T | undefined =>
  items[Math.floor(rng() * items.length)];

/** Builds a multiple-choice question with the correct option at a random position. */
function choice(
  base: BaseQuestion,
  correct: string,
  distractors: string[],
  rng: () => number,
): ChoiceQuestion | null {
  const unique = [...new Set(distractors.filter((d) => normalizeText(d) !== normalizeText(correct)))];
  if (unique.length < 3) return null;
  const opciones = shuffle([correct, ...shuffle(unique, rng).slice(0, 3)], rng);
  return { ...base, tipo: 'opcion', opciones, correcta: opciones.indexOf(correct) };
}

/** Hides the subtopic name inside its own example so the question is not answered by copying words. */
function mask(text: string, name: string): string {
  const words = name.split(/\s+/).filter((w) => w.length > 3);
  let out = text;
  for (const w of [name, ...words]) {
    out = out.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '▁▁▁');
  }
  return out;
}

const shorten = (text: string, max = 260) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

export function abacoQuestions(
  materia: Materia,
  temario: Temario,
  ejercicios: Ejercicio[],
  rng: () => number,
): Question[] {
  const subtemas = temario.temas.flatMap((tema) => tema.subtemas.map((s) => ({ ...s, tema })));
  const route = (temaId: string, subtemaId: string) => `/materia/${materia.id}/tema/${temaId}?s=${subtemaId}`;
  const allPoints = subtemas.flatMap((s) => s.puntos_clave.map((p) => ({ p, id: s.id })));
  const out: Question[] = [];

  for (const s of subtemas) {
    const others = subtemas.filter((o) => o.id !== s.id).map((o) => o.nombre);
    const q1 = choice(
      {
        id: `ej:${s.id}`,
        enunciado: '¿Qué subtema ilustra este ejemplo?',
        contexto: mask(s.ejemplo, s.nombre),
        explicacion: `Es «${s.nombre}». ${shorten(s.explicacion, 220)}`,
        origen: 'abaco',
        ruta: route(s.tema.id, s.id),
        subtema: { id: s.id, nombre: s.nombre },
      },
      s.nombre,
      others,
      rng,
    );
    if (q1) out.push(q1);

    const error = pick(s.errores_frecuentes, rng);
    const truths = allPoints.filter((x) => x.id !== s.id).map((x) => x.p);
    if (error) {
      const q2 = choice(
        {
          id: `error:${s.id}`,
          enunciado: `Sobre «${s.nombre}», ¿cuál de estas afirmaciones describe un error frecuente?`,
          explicacion: `El error frecuente es: «${error}». Las otras opciones son ideas correctas de la materia.`,
          origen: 'abaco',
          ruta: route(s.tema.id, s.id),
          subtema: { id: s.id, nombre: s.nombre },
        },
        error,
        truths,
        rng,
      );
      if (q2) out.push(q2);
    }

    const point = pick(s.puntos_clave, rng);
    if (point) {
      const q3 = choice(
        {
          id: `punto:${s.id}`,
          enunciado: `¿Cuál de estas ideas clave corresponde a «${s.nombre}»?`,
          explicacion: `«${point}» es un punto clave de ${s.nombre}.`,
          origen: 'abaco',
          ruta: route(s.tema.id, s.id),
          subtema: { id: s.id, nombre: s.nombre },
        },
        point,
        allPoints
          .filter((x) => !subtemas.find((o) => o.id === x.id && o.tema.id === s.tema.id))
          .map((x) => x.p),
        rng,
      );
      if (q3) out.push(q3);
    }
  }

  for (const e of ejercicios.filter((x) => x.materia === materia.id)) {
    const practised = e.subtema ? subtemas.find((s) => s.id === e.subtema) : undefined;
    out.push({
      id: `num:${e.id}`,
      tipo: 'numero',
      enunciado: e.enunciado,
      respuesta: e.respuesta,
      tolerancia: Math.max(e.tolerancia, 0.005),
      unidad: e.unidad,
      explicacion: e.procedimiento.join(' → '),
      origen: 'abaco',
      ruta: `/practica/${e.id}`,
      ...(practised ? { subtema: { id: practised.id, nombre: practised.nombre } } : {}),
    });
  }
  return out;
}

export function pdfQuestions(definitions: Definition[], pdfName: string, rng: () => number): Question[] {
  const terms = definitions.map((d) => d.termino);
  return definitions
    .map((d, i) =>
      choice(
        {
          id: `pdf:${i}:${normalizeText(d.termino)}`,
          enunciado: `Según tu PDF «${pdfName}», ¿qué término completa la definición?`,
          contexto: `▁▁▁ ${d.definicion}`,
          explicacion: `El término es «${d.termino}». Oración original: «${shorten(d.oracion, 240)}»`,
          origen: 'pdf',
        },
        d.termino,
        terms,
        rng,
      ),
    )
    .filter((q): q is ChoiceQuestion => q !== null);
}

/**
 * An exam of `cantidad` questions. In mixed mode about half come from the PDF when it has enough definitions;
 * if a source runs short, the other fills the gap so the exam always has the size asked (when possible).
 */
export function buildExam(input: {
  materia: Materia;
  temario: Temario;
  ejercicios: Ejercicio[];
  pdf?: { nombre: string; definiciones: Definition[] };
  fuente: ExamSource;
  cantidad: number;
  rng?: () => number;
}): Question[] {
  const rng = input.rng ?? Math.random;
  const fromAbaco =
    input.fuente === 'pdf'
      ? []
      : shuffle(abacoQuestions(input.materia, input.temario, input.ejercicios, rng), rng);
  const fromPdf =
    input.fuente === 'abaco' || !input.pdf
      ? []
      : shuffle(pdfQuestions(input.pdf.definiciones, input.pdf.nombre, rng), rng);
  let selected: Question[];
  if (input.fuente === 'mixto') {
    const half = Math.min(fromPdf.length, Math.floor(input.cantidad / 2));
    selected = [...fromPdf.slice(0, half), ...fromAbaco.slice(0, input.cantidad - half)];
  } else {
    selected = [...fromPdf, ...fromAbaco].slice(0, input.cantidad);
  }
  return shuffle(selected, rng);
}

/** Accepts «1.234,56», «1234.56» or «1234,56» for numeric answers. */
export function parseAnswerNumber(value: string): number | null {
  const v = value.trim().replace(/\s/g, '').replace(/%$/, '');
  if (!v) return null;
  const normalized =
    /,\d{1,}$/.test(v) && v.includes(',') ? v.replace(/\./g, '').replace(',', '.') : v.replace(/,/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function isCorrect(question: Question, answer: number | string | null): boolean {
  if (answer === null) return false;
  if (question.tipo === 'opcion') return answer === question.correcta;
  const n = typeof answer === 'number' ? answer : parseAnswerNumber(answer);
  return n !== null && Math.abs(n - question.respuesta) <= question.tolerancia + 1e-9;
}

export interface ExamResult {
  correctas: number;
  total: number;
  porcentaje: number;
  detalle: { id: string; correcta: boolean }[];
}

export function gradeExam(
  questions: Question[],
  answers: Record<string, number | string | null>,
): ExamResult {
  const detalle = questions.map((q) => ({ id: q.id, correcta: isCorrect(q, answers[q.id] ?? null) }));
  const correctas = detalle.filter((d) => d.correcta).length;
  return {
    correctas,
    total: questions.length,
    porcentaje: questions.length ? Math.round((correctas / questions.length) * 100) : 0,
    detalle,
  };
}

export interface StudyCard {
  id: string;
  mazo: string;
  frente: string;
  reverso: string;
  origen: 'subtema' | 'pdf';
}

/** Flashcards: one per subtopic (theory and example) and one per definition found in the PDF. */
export function studyCards(
  materia: Materia,
  temario: Temario,
  pdf?: { id: string; nombre: string; definiciones: Definition[] },
): StudyCard[] {
  const fromAbaco = temario.temas.flatMap((tema) =>
    tema.subtemas.map((s) => ({
      id: `subtema:${s.id}`,
      mazo: materia.nombre,
      frente: s.nombre,
      reverso: shorten(`${s.explicacion}\n\nEjemplo: ${s.ejemplo}`, 1900),
      origen: 'subtema' as const,
    })),
  );
  const fromPdf = (pdf?.definiciones ?? []).map((d) => ({
    id: `pdf:${pdf?.id ?? ''}:${normalizeText(d.termino).replace(/\s+/g, '-')}`.slice(0, 100),
    mazo: `${materia.nombre} · ${shorten(pdf?.nombre ?? 'PDF', 40)}`.slice(0, 80),
    frente: d.termino.slice(0, 500),
    reverso: shorten(d.oracion, 1900),
    origen: 'pdf' as const,
  }));
  return [...fromAbaco, ...fromPdf];
}

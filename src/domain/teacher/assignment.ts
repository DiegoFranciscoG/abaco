/**
 * Teacher mode: a worksheet ("taller") is a title and a list of exercise ids. It travels in the link the teacher shares,
 * so nothing is stored anywhere and the link carries no data about the teacher or the students.
 */
export const ASSIGNMENT_LIMITS = { maxExercises: 30, maxTitle: 80 } as const;

export interface Assignment {
  titulo: string;
  ids: string[];
}

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Visible text only: no control characters, single spaces, cut at the limit. */
export function cleanTitle(raw: string): string {
  return raw
    .replace(/\p{Cc}/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, ASSIGNMENT_LIMITS.maxTitle);
}

/** The student link: a path inside ÁBACO, so the app never sends anyone to another site. */
export function assignmentPath(assignment: Assignment): string {
  const params = new URLSearchParams();
  const titulo = cleanTitle(assignment.titulo);
  if (titulo) params.set('titulo', titulo);
  params.set('ejercicios', assignment.ids.slice(0, ASSIGNMENT_LIMITS.maxExercises).join(','));
  return `/practica?${params.toString()}`;
}

/**
 * Reads a worksheet from the link. Unknown, repeated or malformed ids are dropped (an old link keeps working when an
 * exercise is renamed, minus that exercise); returns null when nothing usable is left.
 */
export function parseAssignment(params: URLSearchParams, known: ReadonlySet<string>): Assignment | null {
  const raw = params.get('ejercicios');
  if (!raw) return null;
  const ids = [
    ...new Set(
      raw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => ID.test(s) && known.has(s)),
    ),
  ].slice(0, ASSIGNMENT_LIMITS.maxExercises);
  if (ids.length === 0) return null;
  return { titulo: cleanTitle(params.get('titulo') ?? ''), ids };
}

/** «1.844,93 USD», «12,5 %»: the answer as the answer key prints it. */
export function formatAnswer(value: number, unidad: string): string {
  const number = value.toLocaleString('es-EC', { maximumFractionDigits: 4 });
  if (unidad === 'sin unidad') return number;
  return unidad === '%' ? `${number} %` : `${number} ${unidad}`;
}

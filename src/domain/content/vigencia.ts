/**
 * Validity of the normative figures (content/normativa.json): whether a figure is still in force on a given day and
 * which figures a record mentions. Type-only imports so that Node scripts and tests can load it directly.
 */
import type { Cifra, Ejercicio, Formula, Subtema, Termino, Vigencia } from './schemas';

/** A figure that ends its validity in fewer days than this is announced to the author (test T-11). */
export const DIAS_AVISO = 60;

export type EstadoVigencia = 'vigente' | 'por-vencer' | 'vencida';

const DAY_MS = 86_400_000;

/** Local calendar day as YYYY-MM-DD (the day the student sees, not the UTC one). */
export function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** State of a validity period on `today` (YYYY-MM-DD) and the days left until its last day. */
export function vigenciaStatus(vigencia: Vigencia, today: string): { estado: EstadoVigencia; dias: number } {
  const dias = Math.round((Date.parse(vigencia.hasta) - Date.parse(today)) / DAY_MS);
  if (dias < 0) return { estado: 'vencida', dias };
  return { estado: dias < DIAS_AVISO ? 'por-vencer' : 'vigente', dias };
}

/** Text a student reads in each kind of record: the only text where a figure can appear. */
export function subtemaText(s: Subtema): string {
  return [s.nombre, s.explicacion, s.ejemplo, ...s.puntos_clave, ...s.errores_frecuentes].join('\n');
}

export function formulaText(f: Formula): string {
  return [
    f.nombre,
    f.descripcion,
    ...f.variables.map((v) => v.significado),
    ...f.supuestos,
    ...(f.notas ?? []),
    f.ejemplo.enunciado,
    ...f.ejemplo.pasos,
  ].join('\n');
}

export function ejercicioText(e: Ejercicio): string {
  return [e.enunciado, ...e.procedimiento, ...e.pistas].join('\n');
}

export function terminoText(t: Termino): string {
  return [t.termino, t.definicion].join('\n');
}

/** Ids of the figures whose patterns appear in `text`, in catalog order. */
export function detectCifras(text: string, catalog: readonly Cifra[]): string[] {
  return catalog
    .filter((cifra) => cifra.detectar.some((pattern) => new RegExp(pattern, 'iu').test(text)))
    .map((cifra) => cifra.id);
}

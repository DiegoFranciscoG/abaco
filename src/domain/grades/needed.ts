/**
 * "¿Cuánto necesito?": with the components of a subject, their weights and the grades already obtained, how much
 * the student needs on average in what is still pending to reach a target final grade. Nothing is preset: every
 * teacher uses their own components, weights and scale, so all of them are inputs.
 *
 * Final grade = Σ grade_i × weight_i / 100 (weighted average on the same scale).
 * Needed average on the pending part = (target − accumulated) ÷ (pending weight / 100).
 */

export interface GradeComponent {
  nombre: string;
  /** Percentage of the final grade. */
  peso: number;
  /** Grade obtained, or null while it is pending. */
  nota: number | null;
}

export interface GradeInput {
  componentes: readonly GradeComponent[];
  /** Highest grade of the scale (10, 20, 100…). */
  notaMaxima: number;
  /** Final grade the student wants to reach. */
  objetivo: number;
}

interface Progress {
  /** Points already earned toward the final grade. */
  acumulado: number;
  /** Weight still pending, in percent. */
  pesoPendiente: number;
  /** Final grade if every pending component gets the highest grade. */
  maximoPosible: number;
  /** Each step of the calculation, with its numbers, to check it by hand. */
  pasos: string[];
}

export type GradeOutcome =
  | { estado: 'invalido'; errores: string[] }
  | ({ estado: 'aprobado' | 'reprobado'; final: number } & Progress)
  | ({ estado: 'asegurado' } & Progress)
  | ({ estado: 'necesita'; necesaria: number } & Progress)
  | ({ estado: 'imposible' } & Progress);

const EPS = 1e-9;
const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;
/** Rounded up to the cent: reaching the shown grade is always enough. */
const ceil2 = (value: number): number => Math.ceil(value * 100 - EPS) / 100;
/** Cut to the cent, never rounded up: a failing 6,995 is shown as 6,99, not as a passing-looking 7. */
const floor2 = (value: number): number => Math.floor(value * 100 + EPS) / 100;
const fmt = (value: number): string => round2(value).toLocaleString('es-EC', { maximumFractionDigits: 2 });

export function validateGrades(input: GradeInput): string[] {
  const errores: string[] = [];
  const { componentes, notaMaxima, objetivo } = input;
  if (!Number.isFinite(notaMaxima) || notaMaxima <= 0) {
    errores.push('La nota máxima de la escala tiene que ser mayor que cero.');
    return errores;
  }
  if (!Number.isFinite(objetivo) || objetivo < 0 || objetivo > notaMaxima) {
    errores.push(`La nota que quieres alcanzar tiene que estar entre 0 y ${fmt(notaMaxima)}.`);
  }
  if (componentes.length === 0) errores.push('Agrega al menos un componente de evaluación.');
  componentes.forEach((c, i) => {
    const nombre = c.nombre.trim() || `componente ${i + 1}`;
    if (!Number.isFinite(c.peso) || c.peso <= 0)
      errores.push(`El peso de «${nombre}» tiene que ser mayor que 0 %.`);
    if (c.nota !== null && (!Number.isFinite(c.nota) || c.nota < 0 || c.nota > notaMaxima)) {
      errores.push(
        `La nota de «${nombre}» (${fmt(c.nota)}) está fuera de la escala de 0 a ${fmt(notaMaxima)}.`,
      );
    }
  });
  const total = componentes.reduce((sum, c) => sum + (Number.isFinite(c.peso) ? c.peso : 0), 0);
  if (componentes.length > 0 && Math.abs(total - 100) > 0.01) {
    errores.push(`Los pesos suman ${fmt(total)} %; tienen que sumar 100 %.`);
  }
  return errores;
}

export function neededGrade(input: GradeInput): GradeOutcome {
  const errores = validateGrades(input);
  if (errores.length > 0) return { estado: 'invalido', errores };
  const { componentes, notaMaxima, objetivo } = input;

  const graded = componentes.filter((c) => c.nota !== null);
  const pending = componentes.filter((c) => c.nota === null);
  const acumulado = graded.reduce((sum, c) => sum + (c.nota ?? 0) * (c.peso / 100), 0);
  const pesoPendiente = pending.reduce((sum, c) => sum + c.peso, 0);
  const maximoPosible = acumulado + notaMaxima * (pesoPendiente / 100);

  const pasos = [
    graded.length > 0
      ? `Acumulado = ${graded.map((c) => `${fmt(c.nota ?? 0)} × ${fmt(c.peso)} %`).join(' + ')} = ${fmt(acumulado)}`
      : 'Acumulado = 0 (todavía no hay notas)',
    `Peso pendiente = ${pending.length > 0 ? pending.map((c) => `${fmt(c.peso)} %`).join(' + ') : '0 %'} = ${fmt(pesoPendiente)} %`,
  ];
  const progress = {
    acumulado: round2(acumulado),
    pesoPendiente: round2(pesoPendiente),
    maximoPosible: round2(maximoPosible),
    pasos,
  };

  if (pending.length === 0) {
    const final = floor2(acumulado);
    pasos.push(`Nota final = ${fmt(final)} sobre ${fmt(notaMaxima)}`);
    return { estado: acumulado + EPS >= objetivo ? 'aprobado' : 'reprobado', final, ...progress };
  }

  const necesaria = (objetivo - acumulado) / (pesoPendiente / 100);
  pasos.push(
    `Promedio necesario en lo pendiente = (${fmt(objetivo)} − ${fmt(acumulado)}) ÷ ${fmt(pesoPendiente)} % = ${fmt(necesaria)}`,
  );
  if (necesaria <= EPS) return { estado: 'asegurado', ...progress };
  if (necesaria > notaMaxima + EPS) {
    pasos.push(
      `Con ${fmt(notaMaxima)} en todo lo pendiente llegarías a ${fmt(maximoPosible)}, menos que ${fmt(objetivo)}`,
    );
    return { estado: 'imposible', ...progress };
  }
  return { estado: 'necesita', necesaria: Math.min(notaMaxima, ceil2(necesaria)), ...progress };
}

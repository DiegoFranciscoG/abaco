/**
 * SM-2 spaced repetition (P. Woźniak, 1990; https://super-memory.com/english/ol/sm2.htm):
 * I(1) = 1 day, I(2) = 6 days, I(n) = I(n−1)·EF rounded up; EF starts at 2.5, never below 1.3;
 * EF' = EF + (0.1 − (5 − q)·(0.08 + (5 − q)·0.02)); with q < 3 repetitions restart and EF is kept.
 */
export interface Sm2State {
  ef: number;
  intervalo: number;
  repeticiones: number;
}

export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

export const INITIAL_SM2: Sm2State = { ef: 2.5, intervalo: 0, repeticiones: 0 };

export function review(state: Sm2State, q: Quality): Sm2State {
  if (q < 3) return { ef: state.ef, intervalo: 1, repeticiones: 0 };
  const repeticiones = state.repeticiones + 1;
  const intervalo = repeticiones === 1 ? 1 : repeticiones === 2 ? 6 : Math.ceil(state.intervalo * state.ef);
  const ef = Math.max(1.3, state.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  return { ef: Math.round(ef * 1000) / 1000, intervalo, repeticiones };
}

/** Next review date (ISO) `intervalo` days after `from`. */
export function nextReview(from: Date, intervalo: number): string {
  const next = new Date(from.getTime());
  next.setUTCDate(next.getUTCDate() + intervalo);
  return next.toISOString();
}

/** The four buttons shown to the student, mapped to SM-2 qualities. */
export const ANSWER_BUTTONS: { q: Quality; label: string }[] = [
  { q: 1, label: 'No la recordé' },
  { q: 3, label: 'Difícil' },
  { q: 4, label: 'Bien' },
  { q: 5, label: 'Fácil' },
];

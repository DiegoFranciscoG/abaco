import type { Intento } from '../../data/types';

export interface ExerciseProgress {
  attempts: number;
  solved: boolean;
  correctAttempts: number;
  lastAt: string;
}

/** Per-exercise progress computed on the device from the attempts history. */
export function summarizeAttempts(attempts: Intento[]): Map<string, ExerciseProgress> {
  const map = new Map<string, ExerciseProgress>();
  for (const a of attempts) {
    const current = map.get(a.ejercicioId) ?? { attempts: 0, solved: false, correctAttempts: 0, lastAt: a.fecha };
    current.attempts += 1;
    if (a.correcto) {
      current.solved = true;
      current.correctAttempts += 1;
    }
    if (a.fecha > current.lastAt) current.lastAt = a.fecha;
    map.set(a.ejercicioId, current);
  }
  return map;
}

/** Accuracy per subject: correct attempts over total attempts. */
export function accuracyBySubject(
  attempts: Intento[],
  subjectOf: (ejercicioId: string) => string | undefined,
): Map<string, { attempts: number; correct: number }> {
  const out = new Map<string, { attempts: number; correct: number }>();
  for (const a of attempts) {
    const subject = subjectOf(a.ejercicioId);
    if (!subject) continue;
    const current = out.get(subject) ?? { attempts: 0, correct: 0 };
    current.attempts += 1;
    if (a.correcto) current.correct += 1;
    out.set(subject, current);
  }
  return out;
}

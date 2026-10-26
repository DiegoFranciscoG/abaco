import { INITIAL_SM2, nextReview, review } from '../domain/tools/sm2';
import type { Question } from '../domain/study/quiz';
import { isoDay } from '../domain/content/vigencia';
import { getDb, type AbacoDB } from './db';
import { ValidationError } from './repositories';
import type { Calificacion, ComponenteNota, Entregable, ErrorRepaso, UsoDia } from './types';

/** Everyday tools: grades per subject, failed questions under review, saved deliverables and usage counters. */
export const EVERYDAY_LIMITS = {
  gradePlans: 500,
  components: 30,
  componentName: 60,
  period: 30,
  errors: 5000,
  deliverables: 500,
  deliverableTitle: 120,
  /** A question answered well this many times in a row leaves the review queue. */
  masteredAfter: 3,
} as const;

const now = (): string => new Date().toISOString();

// ---------------------------------------------------------------- grades

export async function listCalificaciones(db: AbacoDB = getDb()): Promise<Calificacion[]> {
  return db.calificaciones.orderBy('actualizadoEn').reverse().toArray();
}

export async function getCalificacion(
  materiaId: string,
  periodo: string,
  db: AbacoDB = getDb(),
): Promise<Calificacion | undefined> {
  return db.calificaciones.where('[materiaId+periodo]').equals([materiaId, periodo]).first();
}

/** Saves the grade plan of a subject and period (one per pair). Components without a name get a numbered one. */
export async function saveCalificacion(
  input: Pick<Calificacion, 'materiaId' | 'periodo' | 'notaMaxima' | 'objetivo' | 'componentes'>,
  db: AbacoDB = getDb(),
): Promise<Calificacion> {
  const periodo = input.periodo.trim().slice(0, EVERYDAY_LIMITS.period);
  if (!periodo) throw new ValidationError('Escribe el período, por ejemplo 2026-2.');
  if (input.componentes.length > EVERYDAY_LIMITS.components) {
    throw new ValidationError(`Una materia admite hasta ${EVERYDAY_LIMITS.components} componentes.`);
  }
  if (!(input.notaMaxima > 0 && input.notaMaxima <= 1000)) {
    throw new ValidationError('La nota máxima tiene que estar entre 1 y 1000.');
  }
  const clamp = (n: number) => Math.min(input.notaMaxima, Math.max(0, n));
  const componentes: ComponenteNota[] = input.componentes.map((c, i) => ({
    id: c.id || crypto.randomUUID(),
    nombre: c.nombre.trim().slice(0, EVERYDAY_LIMITS.componentName) || `Componente ${i + 1}`,
    peso: Number.isFinite(c.peso) ? Math.min(100, Math.max(0, c.peso)) : 0,
    nota: c.nota === null || !Number.isFinite(c.nota) ? null : clamp(c.nota),
  }));
  const existing = await getCalificacion(input.materiaId, periodo, db);
  if (!existing && (await db.calificaciones.count()) >= EVERYDAY_LIMITS.gradePlans) {
    throw new ValidationError('Llegaste al máximo de materias guardadas. Borra un período antiguo.');
  }
  const row: Calificacion = {
    id: existing?.id ?? crypto.randomUUID(),
    materiaId: input.materiaId,
    periodo,
    notaMaxima: input.notaMaxima,
    objetivo: clamp(input.objetivo),
    componentes,
    creadoEn: existing?.creadoEn ?? now(),
    actualizadoEn: now(),
  };
  await db.calificaciones.put(row);
  return row;
}

export async function deleteCalificacion(id: string, db: AbacoDB = getDb()): Promise<void> {
  await db.calificaciones.delete(id);
}

// ---------------------------------------------------------------- failed questions (spaced repetition)

/** Questions failed in an exam enter the review queue; failing one again sends it back to the start. */
export async function recordFailedQuestions(
  materiaId: string,
  questions: readonly Question[],
  db: AbacoDB = getDb(),
  nowDate = new Date(),
): Promise<number> {
  const timestamp = nowDate.toISOString();
  await db.transaction('rw', db.errores, async () => {
    for (const pregunta of questions) {
      const existing = await db.errores.get(pregunta.id);
      const state = existing ? review(existing, 1) : { ...INITIAL_SM2, intervalo: 1 };
      await db.errores.put({
        id: pregunta.id,
        materiaId,
        subtemaId: pregunta.subtema?.id ?? null,
        subtemaNombre: pregunta.subtema?.nombre ?? null,
        pregunta,
        fallos: (existing?.fallos ?? 0) + 1,
        aciertos: existing?.aciertos ?? 0,
        ...state,
        // A fresh mistake is due today: the student can review it right after the exam.
        proximaRevision: existing ? nextReview(nowDate, state.intervalo) : timestamp,
        dominada: false,
        creadoEn: existing?.creadoEn ?? timestamp,
        actualizadoEn: timestamp,
      });
    }
  });
  const count = await db.errores.count();
  if (count > EVERYDAY_LIMITS.errors) {
    const oldest = await db.errores
      .orderBy('proximaRevision')
      .filter((e) => e.dominada)
      .limit(count - EVERYDAY_LIMITS.errors)
      .primaryKeys();
    await db.errores.bulkDelete(oldest);
  }
  return questions.length;
}

/** Records the answer given while reviewing a mistake and schedules it again (SM-2). */
export async function reviewMistake(
  id: string,
  acerto: boolean,
  db: AbacoDB = getDb(),
  nowDate = new Date(),
): Promise<ErrorRepaso | undefined> {
  const existing = await db.errores.get(id);
  if (!existing) return undefined;
  const state = review(existing, acerto ? 4 : 1);
  const updated: ErrorRepaso = {
    ...existing,
    ...state,
    aciertos: existing.aciertos + (acerto ? 1 : 0),
    fallos: existing.fallos + (acerto ? 0 : 1),
    proximaRevision: nextReview(nowDate, state.intervalo),
    dominada: acerto && state.repeticiones >= EVERYDAY_LIMITS.masteredAfter,
    actualizadoEn: nowDate.toISOString(),
  };
  await db.errores.put(updated);
  return updated;
}

export async function listMistakes(materiaId?: string, db: AbacoDB = getDb()): Promise<ErrorRepaso[]> {
  const rows = materiaId
    ? await db.errores.where('materiaId').equals(materiaId).toArray()
    : await db.errores.toArray();
  return rows.sort((a, b) => a.proximaRevision.localeCompare(b.proximaRevision));
}

/** Mistakes not mastered yet whose review date has arrived. */
export function dueMistakes(rows: readonly ErrorRepaso[], nowDate = new Date()): ErrorRepaso[] {
  const limit = nowDate.toISOString();
  return rows.filter((e) => !e.dominada && e.proximaRevision <= limit);
}

export interface HardSubtopic {
  subtemaId: string;
  nombre: string;
  fallos: number;
  pendientes: number;
}

/** Subtopics ordered by how many times their questions were failed (only those still being reviewed count). */
export function hardSubtopics(rows: readonly ErrorRepaso[]): HardSubtopic[] {
  const map = new Map<string, HardSubtopic>();
  for (const e of rows) {
    if (!e.subtemaId) continue;
    const entry = map.get(e.subtemaId) ?? {
      subtemaId: e.subtemaId,
      nombre: e.subtemaNombre ?? e.subtemaId,
      fallos: 0,
      pendientes: 0,
    };
    entry.fallos += e.fallos;
    if (!e.dominada) entry.pendientes += 1;
    map.set(e.subtemaId, entry);
  }
  return [...map.values()]
    .filter((s) => s.pendientes > 0)
    .sort((a, b) => b.fallos - a.fallos || a.nombre.localeCompare(b.nombre));
}

// ---------------------------------------------------------------- deliverables

export async function listEntregables(tipo?: string, db: AbacoDB = getDb()): Promise<Entregable[]> {
  const rows = tipo
    ? await db.entregables.where('tipo').equals(tipo).toArray()
    : await db.entregables.toArray();
  return rows.sort((a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn));
}

export async function saveEntregable(
  input: { id?: string; tipo: string; titulo: string; entradas: Record<string, unknown> },
  db: AbacoDB = getDb(),
): Promise<Entregable> {
  const titulo = input.titulo.trim().slice(0, EVERYDAY_LIMITS.deliverableTitle) || 'Sin título';
  const existing = input.id ? await db.entregables.get(input.id) : undefined;
  if (!existing && (await db.entregables.count()) >= EVERYDAY_LIMITS.deliverables) {
    throw new ValidationError(
      `Puedes guardar hasta ${EVERYDAY_LIMITS.deliverables} entregables. Borra alguno que ya entregaste.`,
    );
  }
  const row: Entregable = {
    id: existing?.id ?? crypto.randomUUID(),
    tipo: input.tipo,
    titulo,
    entradas: input.entradas,
    creadoEn: existing?.creadoEn ?? now(),
    actualizadoEn: now(),
  };
  await db.entregables.put(row);
  return row;
}

export async function deleteEntregable(id: string, db: AbacoDB = getDb()): Promise<void> {
  await db.entregables.delete(id);
}

// ---------------------------------------------------------------- local usage counters

/** Event names the app counts. Nothing personal: just how many times something happened on a day. */
export const USAGE_EVENTS = [
  'apertura',
  'entregable',
  'exportacion',
  'examen',
  'repaso',
  'calculo-notas',
  'enunciado',
  'coleccion-compartida',
  'taller',
] as const;
export type UsageEvent = (typeof USAGE_EVENTS)[number];

export async function countUsage(
  event: UsageEvent,
  db: AbacoDB = getDb(),
  nowDate = new Date(),
): Promise<void> {
  const dia = isoDay(nowDate);
  await db.transaction('rw', db.uso, async () => {
    const row = (await db.uso.get(dia)) ?? { dia, eventos: {} };
    row.eventos[event] = (row.eventos[event] ?? 0) + 1;
    await db.uso.put(row);
  });
}

/** Marks today as a day of use, once: reloading the page does not inflate the count. */
export async function recordOpening(db: AbacoDB = getDb(), nowDate = new Date()): Promise<void> {
  const dia = isoDay(nowDate);
  await db.transaction('rw', db.uso, async () => {
    const row = (await db.uso.get(dia)) ?? { dia, eventos: {} };
    if (row.eventos.apertura) return;
    row.eventos.apertura = 1;
    await db.uso.put(row);
  });
}

export async function listUsage(db: AbacoDB = getDb()): Promise<UsoDia[]> {
  return db.uso.orderBy('dia').toArray();
}

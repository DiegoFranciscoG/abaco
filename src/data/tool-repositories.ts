import { checkEntry } from '../domain/tools/journal';
import { INITIAL_SM2, nextReview, review, type Quality } from '../domain/tools/sm2';
import { getDb, type AbacoDB } from './db';
import { ValidationError } from './repositories';
import type { Asiento, Diario, Documento, LineaAsiento, Tablero, Tarjeta } from './types';

export const TOOL_LIMITS = {
  documentTitle: 120,
  documentBody: 200_000,
  documents: 200,
  journalName: 60,
  entries: 500,
  linesPerEntry: 40,
  deckName: 80,
  cardFront: 500,
  cardBack: 2000,
  cards: 5000,
  boardTitle: 80,
  boardItems: 30,
} as const;

const now = (): string => new Date().toISOString();
const newId = (): string => crypto.randomUUID();

function text(value: string, field: string, max: number, allowEmpty = false): string {
  const trimmed = value.trim();
  if (!allowEmpty && trimmed.length === 0) throw new ValidationError(`Escribe ${field}.`);
  if (trimmed.length > max) throw new ValidationError(`${field} admite hasta ${max} caracteres.`);
  return trimmed;
}

// ---------------------------------------------------------------- documents (report editor)

export async function listDocuments(db: AbacoDB = getDb()): Promise<Documento[]> {
  return db.documentos.orderBy('actualizadoEn').reverse().toArray();
}

export async function getDocument(id: string, db: AbacoDB = getDb()): Promise<Documento | undefined> {
  return db.documentos.get(id);
}

export async function saveDocument(
  input: { id?: string; titulo: string; contenido: string; materiaId?: string },
  db: AbacoDB = getDb(),
): Promise<Documento> {
  if (input.contenido.length > TOOL_LIMITS.documentBody) {
    throw new ValidationError(`El documento admite hasta ${TOOL_LIMITS.documentBody.toLocaleString('es-EC')} caracteres.`);
  }
  const existing = input.id ? await db.documentos.get(input.id) : undefined;
  if (!existing && (await db.documentos.count()) >= TOOL_LIMITS.documents) {
    throw new ValidationError(`Puedes guardar hasta ${TOOL_LIMITS.documents} documentos. Borra alguno que ya no uses.`);
  }
  const doc: Documento = {
    id: existing?.id ?? newId(),
    titulo: text(input.titulo || 'Sin título', 'el título', TOOL_LIMITS.documentTitle),
    contenido: input.contenido,
    creadoEn: existing?.creadoEn ?? now(),
    actualizadoEn: now(),
    ...(input.materiaId ? { materiaId: input.materiaId } : {}),
  };
  await db.documentos.put(doc);
  return doc;
}

export async function deleteDocument(id: string, db: AbacoDB = getDb()): Promise<void> {
  await db.documentos.delete(id);
}

// ---------------------------------------------------------------- journals

export async function listJournals(db: AbacoDB = getDb()): Promise<Diario[]> {
  return db.diarios.orderBy('actualizadoEn').reverse().toArray();
}

export async function createJournal(nombre: string, db: AbacoDB = getDb()): Promise<Diario> {
  const diario: Diario = { id: newId(), nombre: text(nombre, 'el nombre', TOOL_LIMITS.journalName), asientos: [], creadoEn: now(), actualizadoEn: now() };
  await db.diarios.put(diario);
  return diario;
}

export async function addEntry(
  diarioId: string,
  input: { fecha: string; glosa: string; lineas: LineaAsiento[] },
  db: AbacoDB = getDb(),
): Promise<Diario> {
  const diario = await db.diarios.get(diarioId);
  if (!diario) throw new ValidationError('El libro diario ya no existe.');
  if (diario.asientos.length >= TOOL_LIMITS.entries) throw new ValidationError(`Un libro admite hasta ${TOOL_LIMITS.entries} asientos.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fecha)) throw new ValidationError('Elige la fecha del asiento.');
  if (input.lineas.length > TOOL_LIMITS.linesPerEntry) throw new ValidationError(`Un asiento admite hasta ${TOOL_LIMITS.linesPerEntry} líneas.`);
  const lineas = input.lineas.map((l) => ({ ...l, cuenta: text(l.cuenta, 'la cuenta', 80) }));
  const check = checkEntry(lineas);
  if (!check.ok) throw new ValidationError(check.errores[0] ?? 'El asiento no es válido.');
  const asiento: Asiento = { id: newId(), fecha: input.fecha, glosa: text(input.glosa, 'la glosa', 200, true), lineas };
  const next: Diario = { ...diario, asientos: [...diario.asientos, asiento].sort((a, b) => a.fecha.localeCompare(b.fecha)), actualizadoEn: now() };
  await db.diarios.put(next);
  return next;
}

export async function deleteEntry(diarioId: string, asientoId: string, db: AbacoDB = getDb()): Promise<void> {
  const diario = await db.diarios.get(diarioId);
  if (!diario) return;
  await db.diarios.put({ ...diario, asientos: diario.asientos.filter((a) => a.id !== asientoId), actualizadoEn: now() });
}

export async function deleteJournal(id: string, db: AbacoDB = getDb()): Promise<void> {
  await db.diarios.delete(id);
}

// ---------------------------------------------------------------- flashcards (SM-2)

export async function listDecks(db: AbacoDB = getDb()): Promise<{ mazo: string; total: number; pendientes: number }[]> {
  const cards = await db.tarjetas.toArray();
  const at = now();
  const decks = new Map<string, { total: number; pendientes: number }>();
  for (const c of cards) {
    const d = decks.get(c.mazo) ?? { total: 0, pendientes: 0 };
    d.total += 1;
    if (c.proximaRevision <= at) d.pendientes += 1;
    decks.set(c.mazo, d);
  }
  return [...decks.entries()].map(([mazo, d]) => ({ mazo, ...d })).sort((a, b) => a.mazo.localeCompare(b.mazo, 'es'));
}

export async function dueCards(mazo: string, at: Date = new Date(), db: AbacoDB = getDb()): Promise<Tarjeta[]> {
  const iso = at.toISOString();
  return (await db.tarjetas.where('mazo').equals(mazo).toArray())
    .filter((c) => c.proximaRevision <= iso)
    .sort((a, b) => a.proximaRevision.localeCompare(b.proximaRevision));
}

/**
 * Adds cards; `id` makes imports idempotent (e.g. "glosario:activo"), so importing a deck twice does not
 * duplicate cards or reset their progress.
 */
export async function addCards(
  cards: { id?: string; mazo: string; frente: string; reverso: string; origen: Tarjeta['origen'] }[],
  db: AbacoDB = getDb(),
): Promise<number> {
  const total = await db.tarjetas.count();
  if (total + cards.length > TOOL_LIMITS.cards) throw new ValidationError(`Puedes guardar hasta ${TOOL_LIMITS.cards} tarjetas.`);
  let added = 0;
  await db.transaction('rw', db.tarjetas, async () => {
    for (const c of cards) {
      const id = c.id ?? newId();
      if (await db.tarjetas.get(id)) continue;
      const stamp = now();
      await db.tarjetas.put({
        id,
        mazo: text(c.mazo, 'el mazo', TOOL_LIMITS.deckName),
        frente: text(c.frente, 'el frente', TOOL_LIMITS.cardFront),
        reverso: text(c.reverso, 'el reverso', TOOL_LIMITS.cardBack),
        origen: c.origen,
        ...INITIAL_SM2,
        proximaRevision: stamp,
        creadoEn: stamp,
        actualizadoEn: stamp,
      });
      added += 1;
    }
  });
  return added;
}

export async function reviewCard(id: string, q: Quality, at: Date = new Date(), db: AbacoDB = getDb()): Promise<Tarjeta> {
  const card = await db.tarjetas.get(id);
  if (!card) throw new ValidationError('La tarjeta ya no existe.');
  const state = review(card, q);
  const next: Tarjeta = { ...card, ...state, proximaRevision: nextReview(at, state.intervalo), actualizadoEn: at.toISOString() };
  await db.tarjetas.put(next);
  return next;
}

export async function deleteDeck(mazo: string, db: AbacoDB = getDb()): Promise<void> {
  await db.tarjetas.where('mazo').equals(mazo).delete();
}

// ---------------------------------------------------------------- boards (SWOT and decision matrix)

export async function listBoards(db: AbacoDB = getDb()): Promise<Tablero[]> {
  return db.tableros.orderBy('actualizadoEn').reverse().toArray();
}

export async function saveBoard(board: Omit<Tablero, 'creadoEn' | 'actualizadoEn' | 'id'> & { id?: string }, db: AbacoDB = getDb()): Promise<Tablero> {
  const existing = board.id ? await db.tableros.get(board.id) : undefined;
  const list = (items: string[]) => items.map((i) => text(i, 'el elemento', 200)).slice(0, TOOL_LIMITS.boardItems);
  const next: Tablero = {
    ...board,
    id: existing?.id ?? newId(),
    titulo: text(board.titulo, 'el título', TOOL_LIMITS.boardTitle),
    ...(board.foda
      ? { foda: { fortalezas: list(board.foda.fortalezas), oportunidades: list(board.foda.oportunidades), debilidades: list(board.foda.debilidades), amenazas: list(board.foda.amenazas) } }
      : {}),
    creadoEn: existing?.creadoEn ?? now(),
    actualizadoEn: now(),
  };
  await db.tableros.put(next);
  return next;
}

export async function deleteBoard(id: string, db: AbacoDB = getDb()): Promise<void> {
  await db.tableros.delete(id);
}

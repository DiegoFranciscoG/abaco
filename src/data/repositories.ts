import { normalizeText } from '../domain/text/normalize';
import { getDb, type AbacoDB } from './db';
import {
  COLLECTION_COLORS,
  DEFAULT_PROFILE,
  type Apunte,
  type ArticuloSnapshot,
  type Busqueda,
  type Coleccion,
  type CollectionColor,
  type Estrella,
  type EstrellaTipo,
  type Hoja,
  type Intento,
  type ItemColeccion,
  type Perfil,
  type Recordatorio,
  type RefTipo,
} from './types';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const LIMITS = {
  noteTitle: 120,
  noteBody: 20_000,
  tags: 10,
  tagLength: 30,
  collectionName: 60,
  collectionDescription: 280,
  collectionItems: 500,
  reminderTitle: 120,
  sheetName: 60,
  searchHistory: 30,
} as const;

const now = (): string => new Date().toISOString();
const newId = (): string => crypto.randomUUID();

function requireText(value: string, field: string, max: number, allowEmpty = false): string {
  const trimmed = value.trim();
  if (!allowEmpty && trimmed.length === 0) throw new ValidationError(`Escribe ${field}.`);
  if (trimmed.length > max) throw new ValidationError(`${field} admite hasta ${max} caracteres.`);
  return trimmed;
}

// ---------------------------------------------------------------- profile and meta

export async function getProfile(db: AbacoDB = getDb()): Promise<Perfil> {
  return { ...DEFAULT_PROFILE, ...((await db.perfil.get('yo')) ?? {}) };
}

export async function updateProfile(
  changes: Partial<Omit<Perfil, 'id'>>,
  db: AbacoDB = getDb(),
): Promise<Perfil> {
  const next: Perfil = { ...(await getProfile(db)), ...changes, id: 'yo' };
  await db.perfil.put(next);
  return next;
}

export async function getMeta<T>(clave: string, db: AbacoDB = getDb()): Promise<T | undefined> {
  return (await db.meta.get(clave))?.valor as T | undefined;
}

export async function setMeta(clave: string, valor: unknown, db: AbacoDB = getDb()): Promise<void> {
  await db.meta.put({ clave, valor });
}

/**
 * Anonymous identifier generated on the device. It is never sent anywhere: it only names backup files so the
 * student can tell their copies apart (checked by test T-04).
 */
export async function getDeviceId(db: AbacoDB = getDb()): Promise<string> {
  const existing = await getMeta<string>('deviceId', db);
  if (existing) return existing;
  const created = crypto.randomUUID();
  await setMeta('deviceId', created, db);
  return created;
}

// ---------------------------------------------------------------- notes

export interface NoteInput {
  id?: string;
  refTipo: RefTipo;
  refId: string;
  titulo: string;
  contenido: string;
  etiquetas?: string[];
}

function cleanTags(tags: string[] = []): string[] {
  const unique = [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];
  if (unique.length > LIMITS.tags) throw new ValidationError(`Usa como máximo ${LIMITS.tags} etiquetas.`);
  for (const tag of unique) {
    if (tag.length > LIMITS.tagLength) {
      throw new ValidationError(`Cada etiqueta admite hasta ${LIMITS.tagLength} caracteres.`);
    }
  }
  return unique;
}

export async function saveNote(input: NoteInput, db: AbacoDB = getDb()): Promise<Apunte> {
  const titulo = requireText(input.titulo, 'el título', LIMITS.noteTitle, true);
  const contenido = requireText(input.contenido, 'el apunte', LIMITS.noteBody);
  const etiquetas = cleanTags(input.etiquetas);
  const existing = input.id ? await db.apuntes.get(input.id) : undefined;
  const timestamp = now();
  const note: Apunte = {
    id: existing?.id ?? newId(),
    refTipo: input.refTipo,
    refId: input.refId,
    titulo,
    contenido,
    etiquetas,
    creadoEn: existing?.creadoEn ?? timestamp,
    actualizadoEn: timestamp,
  };
  await db.apuntes.put(note);
  return note;
}

export async function listNotes(
  filter: { refTipo?: RefTipo; refId?: string } = {},
  db: AbacoDB = getDb(),
): Promise<Apunte[]> {
  const notes =
    filter.refTipo && filter.refId
      ? await db.apuntes.where('[refTipo+refId]').equals([filter.refTipo, filter.refId]).toArray()
      : await db.apuntes.toArray();
  return notes.sort((a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn));
}

export async function searchNotes(query: string, db: AbacoDB = getDb()): Promise<Apunte[]> {
  const needle = normalizeText(query);
  if (!needle) return listNotes({}, db);
  const notes = await listNotes({}, db);
  return notes.filter((n) =>
    normalizeText(`${n.titulo} ${n.contenido} ${n.etiquetas.join(' ')}`).includes(needle),
  );
}

export async function deleteNote(id: string, db: AbacoDB = getDb()): Promise<void> {
  await db.apuntes.delete(id);
}

// ---------------------------------------------------------------- stars

export interface StarInput {
  tipo: EstrellaTipo;
  refId: string;
  titulo: string;
  ruta?: string;
  snapshot?: ArticuloSnapshot;
}

export const starId = (tipo: EstrellaTipo, refId: string): string => `${tipo}:${refId}`;

export async function isStarred(tipo: EstrellaTipo, refId: string, db: AbacoDB = getDb()): Promise<boolean> {
  return (await db.estrellas.get(starId(tipo, refId))) !== undefined;
}

/** Marks or unmarks an item. Returns the new state. */
export async function toggleStar(input: StarInput, db: AbacoDB = getDb()): Promise<boolean> {
  const id = starId(input.tipo, input.refId);
  if (await db.estrellas.get(id)) {
    await db.estrellas.delete(id);
    return false;
  }
  const star: Estrella = { id, ...input, creadoEn: now() };
  await db.estrellas.put(star);
  return true;
}

export async function listStars(db: AbacoDB = getDb()): Promise<Estrella[]> {
  return (await db.estrellas.toArray()).sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
}

// ---------------------------------------------------------------- collections

export interface CollectionInput {
  nombre: string;
  descripcion?: string;
  color?: CollectionColor;
}

function checkColor(color: CollectionColor | undefined): CollectionColor {
  if (color === undefined) return 'carmin';
  if (!COLLECTION_COLORS.includes(color)) throw new ValidationError('Color de colección no válido.');
  return color;
}

export async function createCollection(input: CollectionInput, db: AbacoDB = getDb()): Promise<Coleccion> {
  const timestamp = now();
  const collection: Coleccion = {
    id: newId(),
    nombre: requireText(input.nombre, 'el nombre', LIMITS.collectionName),
    descripcion: requireText(input.descripcion ?? '', 'la descripción', LIMITS.collectionDescription, true),
    color: checkColor(input.color),
    items: [],
    creadoEn: timestamp,
    actualizadoEn: timestamp,
  };
  await db.colecciones.put(collection);
  return collection;
}

async function mutateCollection(
  id: string,
  change: (collection: Coleccion) => Coleccion,
  db: AbacoDB,
): Promise<Coleccion> {
  return db.transaction('rw', db.colecciones, async () => {
    const current = await db.colecciones.get(id);
    if (!current) throw new ValidationError('La colección ya no existe.');
    const next = { ...change(current), actualizadoEn: now() };
    await db.colecciones.put(next);
    return next;
  });
}

export async function updateCollection(
  id: string,
  input: CollectionInput,
  db: AbacoDB = getDb(),
): Promise<Coleccion> {
  return mutateCollection(
    id,
    (c) => ({
      ...c,
      nombre: requireText(input.nombre, 'el nombre', LIMITS.collectionName),
      descripcion: requireText(
        input.descripcion ?? c.descripcion,
        'la descripción',
        LIMITS.collectionDescription,
        true,
      ),
      color: checkColor(input.color ?? c.color),
    }),
    db,
  );
}

export async function deleteCollection(id: string, db: AbacoDB = getDb()): Promise<void> {
  await db.colecciones.delete(id);
}

export async function addToCollection(
  id: string,
  item: Omit<ItemColeccion, 'agregadoEn'>,
  db: AbacoDB = getDb(),
): Promise<Coleccion> {
  return mutateCollection(
    id,
    (c) => {
      if (c.items.some((i) => i.tipo === item.tipo && i.refId === item.refId)) return c;
      if (c.items.length >= LIMITS.collectionItems) {
        throw new ValidationError(`Una colección admite hasta ${LIMITS.collectionItems} elementos.`);
      }
      return { ...c, items: [...c.items, { ...item, agregadoEn: now() }] };
    },
    db,
  );
}

export async function removeFromCollection(
  id: string,
  tipo: EstrellaTipo,
  refId: string,
  db: AbacoDB = getDb(),
): Promise<Coleccion> {
  return mutateCollection(
    id,
    (c) => ({ ...c, items: c.items.filter((i) => !(i.tipo === tipo && i.refId === refId)) }),
    db,
  );
}

/** Moves an item inside a collection (the student decides the order). */
export async function moveInCollection(
  id: string,
  from: number,
  to: number,
  db: AbacoDB = getDb(),
): Promise<Coleccion> {
  return mutateCollection(
    id,
    (c) => {
      if (from < 0 || from >= c.items.length || to < 0 || to >= c.items.length) return c;
      const items = [...c.items];
      const [moved] = items.splice(from, 1);
      if (moved) items.splice(to, 0, moved);
      return { ...c, items };
    },
    db,
  );
}

export async function listCollections(db: AbacoDB = getDb()): Promise<Coleccion[]> {
  return (await db.colecciones.toArray()).sort((a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn));
}

// ---------------------------------------------------------------- reminders

export interface ReminderInput {
  titulo: string;
  fecha: string;
  materiaId?: string;
  avisoMinutos?: number;
}

export async function createReminder(input: ReminderInput, db: AbacoDB = getDb()): Promise<Recordatorio> {
  const date = new Date(input.fecha);
  if (Number.isNaN(date.getTime())) throw new ValidationError('La fecha no es válida.');
  const aviso = input.avisoMinutos ?? 60;
  if (!Number.isInteger(aviso) || aviso < 0 || aviso > 60 * 24 * 14) {
    throw new ValidationError('El aviso debe estar entre 0 minutos y 14 días antes.');
  }
  const reminder: Recordatorio = {
    id: newId(),
    titulo: requireText(input.titulo, 'el título', LIMITS.reminderTitle),
    fecha: date.toISOString(),
    avisoMinutos: aviso,
    estado: 'pendiente',
    creadoEn: now(),
    ...(input.materiaId ? { materiaId: input.materiaId } : {}),
  };
  await db.recordatorios.put(reminder);
  return reminder;
}

export async function setReminderDone(id: string, done: boolean, db: AbacoDB = getDb()): Promise<void> {
  await db.recordatorios.update(id, { estado: done ? 'hecho' : 'pendiente' });
}

export async function deleteReminder(id: string, db: AbacoDB = getDb()): Promise<void> {
  await db.recordatorios.delete(id);
}

export async function listReminders(db: AbacoDB = getDb()): Promise<Recordatorio[]> {
  return db.recordatorios.orderBy('fecha').toArray();
}

// ---------------------------------------------------------------- practice attempts

export async function recordAttempt(
  attempt: Omit<Intento, 'id' | 'fecha'>,
  db: AbacoDB = getDb(),
): Promise<Intento> {
  if (!Number.isFinite(attempt.respuesta)) throw new ValidationError('La respuesta debe ser un número.');
  const row: Intento = {
    ...attempt,
    id: newId(),
    fecha: now(),
    segundos: Math.max(0, Math.round(attempt.segundos)),
  };
  await db.intentos.put(row);
  return row;
}

export async function listAttempts(ejercicioId?: string, db: AbacoDB = getDb()): Promise<Intento[]> {
  const rows = ejercicioId
    ? await db.intentos.where('ejercicioId').equals(ejercicioId).toArray()
    : await db.intentos.toArray();
  return rows.sort((a, b) => b.fecha.localeCompare(a.fecha));
}

// ---------------------------------------------------------------- spreadsheets

export async function saveSheet(
  sheet: Omit<Hoja, 'id' | 'creadoEn' | 'actualizadoEn'> & { id?: string },
  db: AbacoDB = getDb(),
): Promise<Hoja> {
  const existing = sheet.id ? await db.hojas.get(sheet.id) : undefined;
  const timestamp = now();
  const row: Hoja = {
    ...sheet,
    id: existing?.id ?? newId(),
    nombre: requireText(sheet.nombre, 'el nombre de la hoja', LIMITS.sheetName),
    creadoEn: existing?.creadoEn ?? timestamp,
    actualizadoEn: timestamp,
  };
  await db.hojas.put(row);
  return row;
}

export async function listSheets(db: AbacoDB = getDb()): Promise<Hoja[]> {
  return (await db.hojas.toArray()).sort((a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn));
}

export async function deleteSheet(id: string, db: AbacoDB = getDb()): Promise<void> {
  await db.hojas.delete(id);
}

// ---------------------------------------------------------------- academic search history and cache

export async function recordSearch(consulta: string, total: number, db: AbacoDB = getDb()): Promise<void> {
  const text = consulta.trim();
  if (!text) return;
  await db.transaction('rw', db.busquedas, async () => {
    const same = await db.busquedas
      .filter((b) => normalizeText(b.consulta) === normalizeText(text))
      .toArray();
    await db.busquedas.bulkDelete(same.map((b) => b.id));
    await db.busquedas.put({ id: newId(), consulta: text, fecha: now(), total } satisfies Busqueda);
    const all = await db.busquedas.orderBy('fecha').toArray();
    const excess = all.length - LIMITS.searchHistory;
    if (excess > 0) await db.busquedas.bulkDelete(all.slice(0, excess).map((b) => b.id));
  });
}

export async function listSearches(db: AbacoDB = getDb()): Promise<Busqueda[]> {
  return (await db.busquedas.orderBy('fecha').reverse().toArray()).slice(0, LIMITS.searchHistory);
}

export async function clearSearches(db: AbacoDB = getDb()): Promise<void> {
  await db.busquedas.clear();
}

export async function getCached<T>(
  clave: string,
  nowMs = Date.now(),
  db: AbacoDB = getDb(),
): Promise<T | undefined> {
  const row = await db.cacheApi.get(clave);
  if (!row) return undefined;
  if (row.expiraEn <= nowMs) {
    await db.cacheApi.delete(clave);
    return undefined;
  }
  return row.datos as T;
}

export async function setCached(
  clave: string,
  datos: unknown,
  ttlMs: number,
  nowMs = Date.now(),
  db: AbacoDB = getDb(),
): Promise<void> {
  await db.cacheApi.put({ clave, datos, expiraEn: nowMs + ttlMs });
}

export async function purgeExpiredCache(nowMs = Date.now(), db: AbacoDB = getDb()): Promise<number> {
  return db.cacheApi.where('expiraEn').belowOrEqual(nowMs).delete();
}

// ---------------------------------------------------------------- everything

/** Counts what the student has saved (used for the backup reminder and the settings page). */
export async function countUserData(db: AbacoDB = getDb()): Promise<Record<string, number>> {
  const [
    apuntes,
    estrellas,
    colecciones,
    recordatorios,
    intentos,
    hojas,
    documentos,
    diarios,
    tarjetas,
    tableros,
    pdfs,
    examenes,
  ] = await Promise.all([
    db.apuntes.count(),
    db.estrellas.count(),
    db.colecciones.count(),
    db.recordatorios.count(),
    db.intentos.count(),
    db.hojas.count(),
    db.documentos.count(),
    db.diarios.count(),
    db.tarjetas.count(),
    db.tableros.count(),
    db.pdfs.count(),
    db.examenes.count(),
  ]);
  return {
    apuntes,
    estrellas,
    colecciones,
    recordatorios,
    intentos,
    hojas,
    documentos,
    diarios,
    tarjetas,
    tableros,
    pdfs,
    examenes,
  };
}

/** Deletes every table, including the local identifier: the next visit starts from zero. */
export async function wipeAllData(db: AbacoDB = getDb()): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
  });
}

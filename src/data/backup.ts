import { z } from 'zod';
import { CELL_FORMATS } from '../domain/content/schemas';
import { BACKUP_TABLES, getDb, migrateNoteV1toV2, SCHEMA_VERSION, type AbacoDB } from './db';
import { getDeviceId } from './repositories';
import { COLLECTION_COLORS } from './types';

export { BACKUP_REMINDER_DAYS, markBackupDone, needsBackupReminder, shouldRemindBackup } from './backup-reminder';

export const BACKUP_FORMAT = 'abaco-respaldo';
export const MAX_BACKUP_BYTES = 25 * 1024 * 1024;

const isoDateTime = z.iso.datetime({ offset: true });
const shortText = z.string().max(500);
const snapshotSchema = z.object({
  titulo: z.string().max(1000),
  autores: z.array(z.string().max(300)).max(200),
  anio: z.number().int().optional(),
  revista: z.string().max(500).optional(),
  doi: z.string().max(300).optional(),
  url: z.string().max(2000),
  fuente: shortText,
  cita: z.string().max(5000),
});
const starKind = z.enum(['formula', 'subtema', 'ejercicio', 'articulo', 'asignatura']);

const perfilSchema = z.object({
  id: z.literal('yo'),
  universidad: shortText.optional(),
  carrera: shortText.optional(),
  ciclo: z.number().int().min(1).max(12).optional(),
  tema: z.enum(['system', 'light', 'dark']),
  movimiento: z.enum(['system', 'reduce', 'full']),
  sintaxisExcel: z.enum(['es', 'en']).default('es'),
});
const apunteSchema = z.object({
  id: z.string().min(1).max(100),
  refTipo: z.enum(['asignatura', 'tema', 'subtema', 'formula', 'libre']),
  refId: shortText,
  titulo: z.string().max(120),
  contenido: z.string().max(20_000),
  etiquetas: z.array(z.string().max(30)).max(10),
  creadoEn: isoDateTime,
  actualizadoEn: isoDateTime,
});
const estrellaSchema = z.object({
  id: shortText,
  tipo: starKind,
  refId: shortText,
  titulo: z.string().max(1000),
  ruta: shortText.optional(),
  snapshot: snapshotSchema.optional(),
  creadoEn: isoDateTime,
});
const coleccionSchema = z.object({
  id: shortText,
  nombre: z.string().min(1).max(60),
  descripcion: z.string().max(280),
  color: z.enum(COLLECTION_COLORS),
  items: z
    .array(
      z.object({
        tipo: starKind,
        refId: shortText,
        titulo: z.string().max(1000),
        ruta: shortText.optional(),
        snapshot: snapshotSchema.optional(),
        agregadoEn: isoDateTime,
      }),
    )
    .max(500),
  creadoEn: isoDateTime,
  actualizadoEn: isoDateTime,
});
const recordatorioSchema = z.object({
  id: shortText,
  titulo: z.string().min(1).max(120),
  asignaturaId: shortText.optional(),
  fecha: isoDateTime,
  avisoMinutos: z.number().int().min(0),
  estado: z.enum(['pendiente', 'hecho']),
  creadoEn: isoDateTime,
});
const intentoSchema = z.object({
  id: shortText,
  ejercicioId: shortText,
  respuesta: z.number(),
  correcto: z.boolean(),
  segundos: z.number().int().min(0),
  fecha: isoDateTime,
});
const hojaSchema = z.object({
  id: shortText,
  nombre: z.string().min(1).max(60),
  plantillaId: shortText.optional(),
  celdas: z.record(z.string().regex(/^[A-Z]{1,3}[0-9]{1,7}$/), z.string().max(2000)),
  formatos: z.record(z.string(), z.enum(CELL_FORMATS)),
  sintaxis: z.enum(['es', 'en']),
  creadoEn: isoDateTime,
  actualizadoEn: isoDateTime,
});
const busquedaSchema = z.object({ id: shortText, consulta: shortText, fecha: isoDateTime, total: z.number().int().min(0) });

const datosV2 = z.object({
  perfil: z.array(perfilSchema).max(1),
  apuntes: z.array(apunteSchema),
  estrellas: z.array(estrellaSchema),
  colecciones: z.array(coleccionSchema),
  recordatorios: z.array(recordatorioSchema),
  intentos: z.array(intentoSchema),
  hojas: z.array(hojaSchema),
  busquedas: z.array(busquedaSchema),
});
export type BackupData = z.infer<typeof datosV2>;

const backupV2Schema = z.object({
  formato: z.literal(BACKUP_FORMAT),
  version: z.literal(2),
  exportadoEn: isoDateTime,
  dispositivo: z.string().max(100),
  datos: datosV2,
});
export type Backup = z.infer<typeof backupV2Schema>;

/** Version 1 files: notes carried `asignaturaId`, and sheets and searches did not exist yet. */
const backupV1Schema = z.object({
  formato: z.literal(BACKUP_FORMAT),
  version: z.literal(1),
  exportadoEn: isoDateTime,
  dispositivo: z.string().max(100),
  datos: z.object({
    perfil: z.array(z.record(z.string(), z.unknown())).max(1).default([]),
    apuntes: z.array(z.record(z.string(), z.unknown())).default([]),
    estrellas: z.array(z.unknown()).default([]),
    colecciones: z.array(z.unknown()).default([]),
    recordatorios: z.array(z.unknown()).default([]),
    intentos: z.array(z.unknown()).default([]),
  }),
});

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

export async function createBackup(db: AbacoDB = getDb(), nowDate = new Date()): Promise<Backup> {
  const datos = Object.fromEntries(
    await Promise.all(BACKUP_TABLES.map(async (table) => [table, await db.table(table).toArray()] as const)),
  ) as BackupData;
  return {
    formato: BACKUP_FORMAT,
    version: SCHEMA_VERSION as 2,
    exportadoEn: nowDate.toISOString(),
    dispositivo: await getDeviceId(db),
    datos,
  };
}

export function backupFileName(backup: Pick<Backup, 'dispositivo' | 'exportadoEn'>): string {
  const shortId = backup.dispositivo.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'local';
  return `abaco-respaldo-${shortId}-${backup.exportadoEn.slice(0, 10)}.json`;
}

export function serializeBackup(backup: Backup): string {
  return JSON.stringify(backup, null, 1);
}

/** Parses and validates a backup file. Old versions are migrated to the current shape. */
export function parseBackup(text: string): Backup {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) {
    throw new BackupError('El archivo supera los 25 MB permitidos para un respaldo.');
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('El archivo no es un respaldo de ÁBACO (JSON inválido).');
  }
  const version = (raw as { version?: unknown } | null)?.version;
  if (version === 1) {
    const v1 = backupV1Schema.safeParse(raw);
    if (!v1.success) throw new BackupError('El respaldo versión 1 está dañado o incompleto.');
    raw = {
      ...v1.data,
      version: 2,
      datos: {
        perfil: v1.data.datos.perfil.map((p) => ({ sintaxisExcel: 'es', ...p })),
        apuntes: v1.data.datos.apuntes.map((n) => migrateNoteV1toV2(n)),
        estrellas: v1.data.datos.estrellas,
        colecciones: v1.data.datos.colecciones,
        recordatorios: v1.data.datos.recordatorios,
        intentos: v1.data.datos.intentos,
        hojas: [],
        busquedas: [],
      },
    };
  }
  const parsed = backupV2Schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const where = first ? ` (${first.path.join('.')})` : '';
    throw new BackupError(`El archivo no es un respaldo válido de ÁBACO${where}.`);
  }
  return parsed.data;
}

export type RestoreMode = 'reemplazar' | 'combinar';

/** Restores a validated backup in a single transaction: either everything is written or nothing is. */
export async function restoreBackup(backup: Backup, mode: RestoreMode, db: AbacoDB = getDb()): Promise<void> {
  const tables = BACKUP_TABLES.map((name) => db.table(name));
  await db.transaction('rw', tables, async () => {
    for (const name of BACKUP_TABLES) {
      const table = db.table(name);
      if (mode === 'reemplazar') await table.clear();
      const rows = backup.datos[name] as unknown[];
      if (rows.length > 0) await table.bulkPut(rows);
    }
  });
}

// ---------------------------------------------------------------- shared collections

export const COLLECTION_FORMAT = 'abaco-coleccion';

const sharedCollectionSchema = z.object({
  formato: z.literal(COLLECTION_FORMAT),
  version: z.literal(1),
  coleccion: coleccionSchema.omit({ id: true }),
});
export type SharedCollection = z.infer<typeof sharedCollectionSchema>;

/** A collection exported for a study group. It contains no notes and no device identifier. */
export function exportCollection(collection: z.infer<typeof coleccionSchema>): string {
  const { id: _id, ...rest } = collection;
  return JSON.stringify({ formato: COLLECTION_FORMAT, version: 1, coleccion: rest } satisfies SharedCollection, null, 1);
}

export function parseSharedCollection(text: string): SharedCollection['coleccion'] {
  if (text.length > 2 * 1024 * 1024) throw new BackupError('El archivo de colección es demasiado grande.');
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('El archivo no es una colección de ÁBACO.');
  }
  const parsed = sharedCollectionSchema.safeParse(raw);
  if (!parsed.success) throw new BackupError('El archivo no es una colección válida de ÁBACO.');
  return parsed.data.coleccion;
}

export async function importSharedCollection(text: string, db: AbacoDB = getDb()): Promise<string> {
  const data = parseSharedCollection(text);
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  await db.colecciones.put({ ...data, id, nombre: data.nombre, creadoEn: timestamp, actualizadoEn: timestamp });
  return id;
}

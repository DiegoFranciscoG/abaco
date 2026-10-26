import { z } from '../domain/zod';
import { CELL_FORMATS } from '../domain/content/schemas';
import {
  BACKUP_TABLES,
  getDb,
  migrateNoteV1toV2,
  migrateRowV2toV3,
  SCHEMA_VERSION,
  type AbacoDB,
} from './db';
import { getDeviceId } from './repositories';
import { ACCOUNT_KINDS, COLLECTION_COLORS } from './types';
import { newId } from '../domain/id';

export {
  BACKUP_REMINDER_DAYS,
  markBackupDone,
  needsBackupReminder,
  shouldRemindBackup,
} from './backup-reminder';

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
const starKind = z.enum(['formula', 'subtema', 'ejercicio', 'articulo', 'materia']);
const contentId = z
  .string()
  .regex(/^[a-z0-9]+(?:-{1,2}[a-z0-9]+)*$/)
  .max(120);

const perfilSchema = z.object({
  id: z.literal('yo'),
  materias: z.array(contentId).max(60).default([]),
  carrera: contentId.nullable().default(null),
  ciclo: z.number().int().min(1).max(12).nullable().default(null),
  tema: z.enum(['system', 'light', 'dark']),
  movimiento: z.enum(['system', 'reduce', 'full']),
  sintaxisExcel: z.enum(['es', 'en']).default('es'),
});
const apunteSchema = z.object({
  id: z.string().min(1).max(100),
  refTipo: z.enum(['materia', 'tema', 'subtema', 'formula', 'libre']),
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
  materiaId: contentId.optional(),
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
const busquedaSchema = z.object({
  id: shortText,
  consulta: shortText,
  fecha: isoDateTime,
  total: z.number().int().min(0),
});
const documentoSchema = z.object({
  id: shortText,
  titulo: z.string().min(1).max(120),
  contenido: z.string().max(200_000),
  materiaId: contentId.optional(),
  creadoEn: isoDateTime,
  actualizadoEn: isoDateTime,
});
const money = z.number().finite().min(0).max(1e12);
const diarioSchema = z.object({
  id: shortText,
  nombre: z.string().min(1).max(60),
  asientos: z
    .array(
      z.object({
        id: shortText,
        fecha: z.iso.date(),
        glosa: z.string().max(200),
        lineas: z
          .array(
            z.object({
              cuenta: z.string().min(1).max(80),
              tipo: z.enum(ACCOUNT_KINDS),
              debe: money,
              haber: money,
            }),
          )
          .min(2)
          .max(40),
      }),
    )
    .max(500),
  creadoEn: isoDateTime,
  actualizadoEn: isoDateTime,
});
const tarjetaSchema = z.object({
  id: shortText,
  mazo: z.string().min(1).max(80),
  frente: z.string().min(1).max(500),
  reverso: z.string().min(1).max(2000),
  origen: z.enum(['glosario', 'subtema', 'propia', 'pdf']),
  ef: z.number().min(1.3).max(5),
  intervalo: z.number().int().min(0).max(36500),
  repeticiones: z.number().int().min(0).max(10_000),
  proximaRevision: isoDateTime,
  creadoEn: isoDateTime,
  actualizadoEn: isoDateTime,
});
const listOfText = z.array(z.string().min(1).max(200)).max(30);
const tableroSchema = z.object({
  id: shortText,
  tipo: z.enum(['foda', 'decision']),
  titulo: z.string().min(1).max(80),
  foda: z
    .object({
      fortalezas: listOfText,
      oportunidades: listOfText,
      debilidades: listOfText,
      amenazas: listOfText,
    })
    .optional(),
  decision: z
    .object({
      criterios: z
        .array(z.object({ nombre: z.string().min(1).max(60), peso: z.number().min(0).max(100) }))
        .max(12),
      opciones: z.array(z.string().min(1).max(60)).max(12),
      puntajes: z.array(z.array(z.number().min(0).max(10)).max(12)).max(12),
    })
    .optional(),
  creadoEn: isoDateTime,
  actualizadoEn: isoDateTime,
});

export const PDF_TEXT_MAX = 400_000;
const pdfSchema = z.object({
  id: shortText,
  nombre: z.string().min(1).max(200),
  materiaId: contentId,
  paginas: z.number().int().min(1).max(2000),
  texto: z.string().max(PDF_TEXT_MAX),
  creadoEn: isoDateTime,
});
const examenSchema = z.object({
  id: shortText,
  materiaId: contentId,
  fuentes: z.enum(['abaco', 'pdf', 'mixto']),
  total: z.number().int().min(1).max(200),
  correctas: z.number().int().min(0).max(200),
  segundos: z.number().int().min(0).max(86_400),
  fecha: isoDateTime,
});

const calificacionSchema = z.object({
  id: shortText,
  materiaId: contentId,
  periodo: z.string().min(1).max(30),
  notaMaxima: z.number().positive().max(1000),
  objetivo: z.number().min(0).max(1000),
  componentes: z
    .array(
      z.object({
        id: shortText,
        nombre: z.string().min(1).max(60),
        peso: z.number().min(0).max(100),
        nota: z.number().min(0).max(1000).nullable(),
      }),
    )
    .max(30),
  creadoEn: isoDateTime,
  actualizadoEn: isoDateTime,
});
const preguntaBase = {
  id: shortText,
  enunciado: z.string().min(1).max(2000),
  contexto: z.string().max(3000).optional(),
  explicacion: z.string().max(3000),
  origen: z.enum(['abaco', 'pdf']),
  ruta: shortText.optional(),
  subtema: z.object({ id: contentId, nombre: z.string().max(200) }).optional(),
};
const preguntaSchema = z.discriminatedUnion('tipo', [
  z.object({
    ...preguntaBase,
    tipo: z.literal('opcion'),
    opciones: z.array(z.string().max(1000)).min(2).max(8),
    correcta: z.number().int().min(0).max(7),
  }),
  z.object({
    ...preguntaBase,
    tipo: z.literal('numero'),
    respuesta: z.number(),
    tolerancia: z.number().nonnegative(),
    unidad: z.string().max(40),
  }),
]);
const errorSchema = z.object({
  id: shortText,
  materiaId: contentId,
  subtemaId: contentId.nullable(),
  subtemaNombre: z.string().max(200).nullable(),
  pregunta: preguntaSchema,
  fallos: z.number().int().min(0).max(100_000),
  aciertos: z.number().int().min(0).max(100_000),
  ef: z.number().min(1.3).max(5),
  intervalo: z.number().int().min(0).max(36500),
  repeticiones: z.number().int().min(0).max(10_000),
  proximaRevision: isoDateTime,
  dominada: z.boolean(),
  creadoEn: isoDateTime,
  actualizadoEn: isoDateTime,
});
const entregableSchema = z.object({
  id: shortText,
  tipo: contentId,
  titulo: z.string().min(1).max(120),
  entradas: z.record(z.string().max(60), z.unknown()),
  creadoEn: isoDateTime,
  actualizadoEn: isoDateTime,
});
const usoSchema = z.object({
  dia: z.iso.date(),
  eventos: z.record(z.string().max(40), z.number().int().min(0).max(1_000_000)),
});

const datosV3 = z.object({
  perfil: z.array(perfilSchema).max(1),
  apuntes: z.array(apunteSchema),
  estrellas: z.array(estrellaSchema),
  colecciones: z.array(coleccionSchema),
  recordatorios: z.array(recordatorioSchema),
  intentos: z.array(intentoSchema),
  hojas: z.array(hojaSchema),
  busquedas: z.array(busquedaSchema),
  documentos: z.array(documentoSchema),
  diarios: z.array(diarioSchema),
  tarjetas: z.array(tarjetaSchema),
  tableros: z.array(tableroSchema),
});
const datosV4 = datosV3.extend({
  pdfs: z.array(pdfSchema).max(50),
  examenes: z.array(examenSchema).max(2000),
});
const datosV5 = datosV4.extend({
  calificaciones: z.array(calificacionSchema).max(500),
  errores: z.array(errorSchema).max(5000),
  entregables: z.array(entregableSchema).max(500),
  uso: z.array(usoSchema).max(3700),
});
export type BackupData = z.infer<typeof datosV5>;

/** Version 3 files: the study area (PDF texts and exams) did not exist yet. */
const backupV3Schema = z.object({
  formato: z.literal(BACKUP_FORMAT),
  version: z.literal(3),
  exportadoEn: isoDateTime,
  dispositivo: z.string().max(100),
  datos: datosV3,
});

/** Version 4 files: the everyday tools (grades, failed questions, deliverables, usage) did not exist yet. */
const backupV4Schema = z.object({
  formato: z.literal(BACKUP_FORMAT),
  version: z.literal(4),
  exportadoEn: isoDateTime,
  dispositivo: z.string().max(100),
  datos: datosV4,
});

const backupV5Schema = z.object({
  formato: z.literal(BACKUP_FORMAT),
  version: z.literal(5),
  exportadoEn: isoDateTime,
  dispositivo: z.string().max(100),
  datos: datosV5,
});
export type Backup = z.infer<typeof backupV5Schema>;

/** Version 2 files: subjects pointed to university curricula and the study tools did not exist yet. */
const backupV2Schema = z.object({
  formato: z.literal(BACKUP_FORMAT),
  version: z.literal(2),
  exportadoEn: isoDateTime,
  dispositivo: z.string().max(100),
  datos: z.object({
    perfil: z.array(z.record(z.string(), z.unknown())).max(1),
    apuntes: z.array(z.record(z.string(), z.unknown())),
    estrellas: z.array(z.record(z.string(), z.unknown())),
    colecciones: z.array(z.record(z.string(), z.unknown())),
    recordatorios: z.array(z.record(z.string(), z.unknown())),
    intentos: z.array(z.unknown()),
    hojas: z.array(z.unknown()),
    busquedas: z.array(z.unknown()),
  }),
});

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
    version: SCHEMA_VERSION as 5,
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
  if ((raw as { formato?: unknown } | null)?.formato !== BACKUP_FORMAT) {
    throw new BackupError('El archivo no es un respaldo válido de ÁBACO.');
  }
  let version = (raw as { version?: unknown } | null)?.version;
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
    version = 2;
  }
  if (version === 2) {
    const v2 = backupV2Schema.safeParse(raw);
    if (!v2.success) throw new BackupError('El respaldo versión 2 está dañado o incompleto.');
    const migrate = (table: string, rows: Record<string, unknown>[]) =>
      rows.map((row) => migrateRowV2toV3(table, row));
    raw = {
      ...v2.data,
      version: 3,
      datos: {
        ...v2.data.datos,
        perfil: migrate('perfil', v2.data.datos.perfil),
        apuntes: migrate('apuntes', v2.data.datos.apuntes),
        estrellas: migrate('estrellas', v2.data.datos.estrellas),
        colecciones: migrate('colecciones', v2.data.datos.colecciones),
        recordatorios: migrate('recordatorios', v2.data.datos.recordatorios),
        documentos: [],
        diarios: [],
        tarjetas: [],
        tableros: [],
      },
    };
  }
  if ((raw as { version?: unknown }).version === 3) {
    const v3 = backupV3Schema.safeParse(raw);
    if (!v3.success) {
      const first = v3.error.issues[0];
      const where = first ? ` (${first.path.join('.')})` : '';
      throw new BackupError(`El archivo no es un respaldo válido de ÁBACO${where}.`);
    }
    raw = { ...v3.data, version: 4, datos: { ...v3.data.datos, pdfs: [], examenes: [] } };
  }
  if ((raw as { version?: unknown }).version === 4) {
    const v4 = backupV4Schema.safeParse(raw);
    if (!v4.success) {
      const first = v4.error.issues[0];
      const where = first ? ` (${first.path.join('.')})` : '';
      throw new BackupError(`El archivo no es un respaldo válido de ÁBACO${where}.`);
    }
    raw = {
      ...v4.data,
      version: 5,
      datos: { ...v4.data.datos, calificaciones: [], errores: [], entregables: [], uso: [] },
    };
  }
  const parsed = backupV5Schema.safeParse(raw);
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
/** A link carries the collection itself (after the #, never sent to a server); longer ones go as a file. */
export const COLLECTION_LINK_MAX = 6000;

/** Only routes inside ÁBACO ("/formulas/van"): a shared link must never carry an outside address. */
const internalRoute = z
  .string()
  .max(500)
  .regex(/^\/(?![/\\])[^\s]*$/, 'Ruta interna no válida');
const sharedItemSchema = z.object({
  tipo: starKind,
  refId: shortText,
  titulo: z.string().max(1000),
  ruta: internalRoute.optional(),
  snapshot: snapshotSchema.optional(),
});
const sharedV2Schema = z.object({
  formato: z.literal(COLLECTION_FORMAT),
  version: z.literal(2),
  coleccion: z.object({
    nombre: z.string().min(1).max(60),
    descripcion: z.string().max(280),
    color: z.enum(COLLECTION_COLORS),
    items: z.array(sharedItemSchema).max(500),
  }),
});
/** Version 1 files also carried the collection dates; they are still accepted and the dates are dropped. */
const sharedV1Schema = z.object({
  formato: z.literal(COLLECTION_FORMAT),
  version: z.literal(1),
  coleccion: coleccionSchema.omit({ id: true }),
});
export type SharedCollection = z.infer<typeof sharedV2Schema>;

/**
 * A collection exported for a study group: its name, description, color and the items the student put in it.
 * No notes, no dates, no internal or device identifier (test T-18).
 */
export function sharedCollection(collection: z.infer<typeof coleccionSchema>): SharedCollection {
  return {
    formato: COLLECTION_FORMAT,
    version: 2,
    coleccion: {
      nombre: collection.nombre,
      descripcion: collection.descripcion,
      color: collection.color,
      items: collection.items.map((item) => ({
        tipo: item.tipo,
        refId: item.refId,
        titulo: item.titulo,
        ...(item.ruta ? { ruta: item.ruta } : {}),
        ...(item.snapshot ? { snapshot: item.snapshot } : {}),
      })),
    },
  };
}

export function exportCollection(collection: z.infer<typeof coleccionSchema>): string {
  return JSON.stringify(sharedCollection(collection), null, 1);
}

export function parseSharedCollection(text: string): SharedCollection['coleccion'] {
  if (text.length > 2 * 1024 * 1024) throw new BackupError('El archivo de colección es demasiado grande.');
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('El archivo no es una colección de ÁBACO.');
  }
  const v2 = sharedV2Schema.safeParse(raw);
  if (v2.success) return v2.data.coleccion;
  const v1 = sharedV1Schema.safeParse(raw);
  if (v1.success) {
    const { nombre, descripcion, color, items } = v1.data.coleccion;
    return { nombre, descripcion, color, items: items.map(({ agregadoEn: _a, ...item }) => item) };
  }
  throw new BackupError('El archivo no es una colección válida de ÁBACO.');
}

const toBase64Url = (bytes: Uint8Array): string => {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromBase64Url = (text: string): Uint8Array => {
  const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

/** The collection packed for a link (base64url of its JSON), or null when it is too long for one. */
export function encodeCollectionLink(collection: z.infer<typeof coleccionSchema>): string | null {
  const encoded = toBase64Url(new TextEncoder().encode(JSON.stringify(sharedCollection(collection))));
  return encoded.length <= COLLECTION_LINK_MAX ? encoded : null;
}

export function decodeCollectionLink(param: string): SharedCollection['coleccion'] {
  if (param.length > COLLECTION_LINK_MAX || !/^[A-Za-z0-9_-]+$/.test(param)) {
    throw new BackupError('El enlace de la colección está incompleto o dañado.');
  }
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(fromBase64Url(param));
  } catch {
    throw new BackupError('El enlace de la colección está incompleto o dañado.');
  }
  return parseSharedCollection(text);
}

export async function saveSharedCollection(
  data: SharedCollection['coleccion'],
  db: AbacoDB = getDb(),
): Promise<string> {
  const id = newId();
  const timestamp = new Date().toISOString();
  await db.colecciones.put({
    ...data,
    id,
    items: data.items.map((item) => ({ ...item, agregadoEn: timestamp })),
    creadoEn: timestamp,
    actualizadoEn: timestamp,
  });
  return id;
}

export async function importSharedCollection(text: string, db: AbacoDB = getDb()): Promise<string> {
  return saveSharedCollection(parseSharedCollection(text), db);
}

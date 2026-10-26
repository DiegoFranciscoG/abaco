import Dexie, { type Table, type Transaction } from 'dexie';
import { legacyMateria, materiaRoute } from './legacy';
import type {
  Apunte,
  Busqueda,
  CacheApi,
  Calificacion,
  Coleccion,
  Diario,
  Documento,
  DocumentoPdf,
  Entregable,
  ErrorRepaso,
  Estrella,
  Examen,
  Hoja,
  Intento,
  MetaRow,
  Perfil,
  Recordatorio,
  Tablero,
  Tarjeta,
  UsoDia,
} from './types';

export const DB_NAME = 'abaco';
export const SCHEMA_VERSION = 5;

/** Version 1 (development release): notes could only be attached to a subject. */
export const SCHEMA_V1 = {
  perfil: 'id',
  apuntes: 'id, asignaturaId, actualizadoEn',
  estrellas: 'id, tipo, creadoEn',
  colecciones: 'id, actualizadoEn',
  recordatorios: 'id, fecha, estado',
  intentos: 'id, ejercicioId, fecha',
};

/** Version 2: notes attach to any level (refTipo + refId), tags, sheets, search history and API cache. */
export const SCHEMA_V2 = {
  meta: 'clave',
  perfil: 'id',
  apuntes: 'id, [refTipo+refId], actualizadoEn, *etiquetas',
  estrellas: 'id, tipo, creadoEn',
  colecciones: 'id, actualizadoEn',
  recordatorios: 'id, fecha, estado',
  intentos: 'id, ejercicioId, fecha',
  hojas: 'id, actualizadoEn',
  busquedas: 'id, fecha',
  cacheApi: 'clave, expiraEn',
};

/** Version 3: subjects come from the catalog (no curricula) and the study tools keep their own tables. */
export const SCHEMA_V3 = {
  ...SCHEMA_V2,
  documentos: 'id, actualizadoEn',
  diarios: 'id, actualizadoEn',
  tarjetas: 'id, mazo, proximaRevision',
  tableros: 'id, tipo, actualizadoEn',
};

/** Version 4: the study area keeps the text of the student's PDFs and the results of practice exams. */
export const SCHEMA_V4 = {
  ...SCHEMA_V3,
  pdfs: 'id, materiaId, creadoEn',
  examenes: 'id, materiaId, fecha',
};

/**
 * Version 5: everyday tools. Grades per subject and period, failed questions under spaced repetition, saved
 * deliverables and local usage counters (one row per day).
 */
export const SCHEMA_V5 = {
  ...SCHEMA_V4,
  calificaciones: 'id, [materiaId+periodo], actualizadoEn',
  errores: 'id, materiaId, proximaRevision',
  entregables: 'id, tipo, actualizadoEn',
  uso: 'dia',
};

type Row = Record<string, unknown>;

/** Star or collection item that pointed to a curriculum subject now points to a catalog subject. */
function migrateStarLike(row: Row): Row {
  if (row.tipo !== 'asignatura') return row;
  const materia = typeof row.refId === 'string' ? legacyMateria(row.refId) : undefined;
  const next: Row = { ...row, tipo: 'materia', refId: materia ?? row.refId };
  next.ruta = materia ? materiaRoute(materia) : '/materias';
  return next;
}

/**
 * Pure migration of one v2 row to the v3 shape (also used when restoring old backup files).
 * Nothing the student wrote is discarded: a note about a subject without an equivalent becomes a free note.
 */
export function migrateRowV2toV3(table: string, row: Row): Row {
  switch (table) {
    case 'perfil': {
      const { universidad: _u, carrera: _c, ciclo: _ci, ...rest } = row;
      return { ...rest, materias: Array.isArray(rest.materias) ? rest.materias : [] };
    }
    case 'apuntes': {
      if (row.refTipo !== 'asignatura') return row;
      const materia = typeof row.refId === 'string' ? legacyMateria(row.refId) : undefined;
      return materia
        ? { ...row, refTipo: 'materia', refId: materia }
        : { ...row, refTipo: 'libre', refId: 'general' };
    }
    case 'estrellas':
      return migrateStarLike(row);
    case 'colecciones':
      return { ...row, items: Array.isArray(row.items) ? (row.items as Row[]).map(migrateStarLike) : [] };
    case 'recordatorios': {
      const { asignaturaId, ...rest } = row;
      const materia = typeof asignaturaId === 'string' ? legacyMateria(asignaturaId) : undefined;
      return materia ? { ...rest, materiaId: materia } : rest;
    }
    default:
      return row;
  }
}

async function upgradeToV3(tx: Transaction): Promise<void> {
  for (const table of ['perfil', 'apuntes', 'estrellas', 'colecciones', 'recordatorios']) {
    await tx
      .table(table)
      .toCollection()
      .modify((row: Row) => {
        // Always a copy: the row is emptied below before the migrated fields are written back.
        const migrated = { ...migrateRowV2toV3(table, { ...row }) };
        for (const key of Object.keys(row)) delete row[key];
        Object.assign(row, migrated);
      });
  }
}

/** Pure migration of one v1 note to the v2 shape (also used when restoring old backup files). */
export function migrateNoteV1toV2(note: Record<string, unknown>): Record<string, unknown> {
  const migrated: Record<string, unknown> = { ...note };
  if (typeof migrated.asignaturaId === 'string') {
    migrated.refTipo = 'asignatura';
    migrated.refId = migrated.asignaturaId;
  } else if (typeof migrated.refTipo !== 'string') {
    migrated.refTipo = 'libre';
    migrated.refId = 'general';
  }
  delete migrated.asignaturaId;
  if (!Array.isArray(migrated.etiquetas)) migrated.etiquetas = [];
  if (typeof migrated.titulo !== 'string') migrated.titulo = '';
  return migrated;
}

async function upgradeToV2(tx: Transaction): Promise<void> {
  await tx
    .table('apuntes')
    .toCollection()
    .modify((note: Record<string, unknown>) => {
      const migrated = migrateNoteV1toV2(note);
      for (const key of Object.keys(note)) delete note[key];
      Object.assign(note, migrated);
    });
}

export class AbacoDB extends Dexie {
  meta!: Table<MetaRow, string>;
  perfil!: Table<Perfil, string>;
  apuntes!: Table<Apunte, string>;
  estrellas!: Table<Estrella, string>;
  colecciones!: Table<Coleccion, string>;
  recordatorios!: Table<Recordatorio, string>;
  intentos!: Table<Intento, string>;
  hojas!: Table<Hoja, string>;
  busquedas!: Table<Busqueda, string>;
  cacheApi!: Table<CacheApi, string>;
  documentos!: Table<Documento, string>;
  diarios!: Table<Diario, string>;
  tarjetas!: Table<Tarjeta, string>;
  tableros!: Table<Tablero, string>;
  pdfs!: Table<DocumentoPdf, string>;
  examenes!: Table<Examen, string>;
  calificaciones!: Table<Calificacion, string>;
  errores!: Table<ErrorRepaso, string>;
  entregables!: Table<Entregable, string>;
  uso!: Table<UsoDia, string>;

  constructor(name: string = DB_NAME) {
    super(name);
    this.version(1).stores(SCHEMA_V1);
    this.version(2).stores(SCHEMA_V2).upgrade(upgradeToV2);
    this.version(3).stores(SCHEMA_V3).upgrade(upgradeToV3);
    this.version(4).stores(SCHEMA_V4);
    this.version(5).stores(SCHEMA_V5);
  }
}

/** Tables included in backups, in restore order. The API cache is derivable and is not backed up. */
export const BACKUP_TABLES = [
  'perfil',
  'apuntes',
  'estrellas',
  'colecciones',
  'recordatorios',
  'intentos',
  'hojas',
  'busquedas',
  'documentos',
  'diarios',
  'tarjetas',
  'tableros',
  'pdfs',
  'examenes',
  'calificaciones',
  'errores',
  'entregables',
  'uso',
] as const;
export type BackupTable = (typeof BACKUP_TABLES)[number];

let instance: AbacoDB | null = null;

export function getDb(): AbacoDB {
  instance ??= new AbacoDB();
  return instance;
}

/** Test helper: replaces the singleton (each test uses an isolated database name). */
export function setDbForTesting(db: AbacoDB | null): void {
  instance = db;
}

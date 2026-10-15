import Dexie, { type Table, type Transaction } from 'dexie';
import type {
  Apunte,
  Busqueda,
  CacheApi,
  Coleccion,
  Estrella,
  Hoja,
  Intento,
  MetaRow,
  Perfil,
  Recordatorio,
} from './types';

export const DB_NAME = 'abaco';
export const SCHEMA_VERSION = 2;

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

  constructor(name: string = DB_NAME) {
    super(name);
    this.version(1).stores(SCHEMA_V1);
    this.version(2).stores(SCHEMA_V2).upgrade(upgradeToV2);
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

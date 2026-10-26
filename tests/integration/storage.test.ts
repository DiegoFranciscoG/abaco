import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  backupFileName,
  BackupError,
  createBackup,
  exportCollection,
  importSharedCollection,
  markBackupDone,
  needsBackupReminder,
  parseBackup,
  restoreBackup,
  serializeBackup,
  shouldRemindBackup,
} from '../../src/data/backup';
import { AbacoDB, SCHEMA_V1, SCHEMA_V2 } from '../../src/data/db';
import {
  addToCollection,
  clearSearches,
  countUserData,
  createCollection,
  createReminder,
  deleteCollection,
  deleteNote,
  deleteReminder,
  deleteSheet,
  getCached,
  getDeviceId,
  getProfile,
  isStarred,
  listAttempts,
  listCollections,
  listNotes,
  listReminders,
  listSearches,
  listSheets,
  listStars,
  moveInCollection,
  purgeExpiredCache,
  recordAttempt,
  recordSearch,
  removeFromCollection,
  saveNote,
  saveSheet,
  searchNotes,
  setCached,
  setReminderDone,
  toggleStar,
  updateCollection,
  updateProfile,
  ValidationError,
  wipeAllData,
} from '../../src/data/repositories';
import {
  checkStorage,
  describeStorageError,
  formatBytes,
  inferPrivateMode,
  requestPersistence,
} from '../../src/data/storage-health';

let db: AbacoDB;
let name: string;

beforeEach(() => {
  name = `abaco-test-${crypto.randomUUID()}`;
  db = new AbacoDB(name);
});

afterEach(async () => {
  db.close();
  await Dexie.delete(name);
});

async function seed(): Promise<void> {
  await updateProfile({ materias: ['contabilidad-general', 'microeconomia'], tema: 'dark' }, db);
  await saveNote(
    {
      refTipo: 'materia',
      refId: 'contabilidad-general',
      titulo: 'Partida doble',
      contenido: 'Debe = Haber',
      etiquetas: ['examen'],
    },
    db,
  );
  await saveNote(
    { refTipo: 'formula', refId: 'van', titulo: '', contenido: 'El VAN descuenta desde t = 1' },
    db,
  );
  await toggleStar({ tipo: 'formula', refId: 'van', titulo: 'VAN', ruta: '/formulas/van' }, db);
  const col = await createCollection(
    { nombre: 'Examen de Costos', descripcion: 'Antes del parcial', color: 'jade' },
    db,
  );
  await addToCollection(col.id, { tipo: 'formula', refId: 'van', titulo: 'VAN' }, db);
  await createReminder(
    { titulo: 'Entregar taller', fecha: '2026-11-03T15:00:00.000Z', avisoMinutos: 120 },
    db,
  );
  await recordAttempt({ ejercicioId: 'e1', respuesta: 12.5, correcto: true, segundos: 40 }, db);
  await saveSheet(
    {
      nombre: 'Amortización',
      celdas: { A1: '1000', B1: '=A1*2' },
      formatos: { A1: 'moneda' },
      sintaxis: 'es',
    },
    db,
  );
  await recordSearch('contabilidad de costos', 120, db);
}

describe('notes', () => {
  it('saves, updates, lists by reference and deletes', async () => {
    const note = await saveNote(
      { refTipo: 'subtema', refId: 's1', titulo: ' Hola ', contenido: 'Texto', etiquetas: ['A', 'a', ' b '] },
      db,
    );
    expect(note.titulo).toBe('Hola');
    expect(note.etiquetas).toEqual(['a', 'b']);
    const updated = await saveNote(
      { id: note.id, refTipo: 'subtema', refId: 's1', titulo: 'Hola', contenido: 'Texto nuevo' },
      db,
    );
    expect(updated.creadoEn).toBe(note.creadoEn);
    expect(await listNotes({ refTipo: 'subtema', refId: 's1' }, db)).toHaveLength(1);
    expect(await listNotes({ refTipo: 'subtema', refId: 'otro' }, db)).toHaveLength(0);
    await deleteNote(note.id, db);
    expect(await listNotes({}, db)).toHaveLength(0);
  });

  it('rejects empty or oversized notes', async () => {
    await expect(
      saveNote({ refTipo: 'libre', refId: 'x', titulo: '', contenido: '   ' }, db),
    ).rejects.toThrow(ValidationError);
    await expect(
      saveNote({ refTipo: 'libre', refId: 'x', titulo: 'x'.repeat(121), contenido: 'ok' }, db),
    ).rejects.toThrow(/120/);
    await expect(
      saveNote(
        {
          refTipo: 'libre',
          refId: 'x',
          titulo: 't',
          contenido: 'ok',
          etiquetas: Array.from({ length: 11 }, (_, i) => `e${i}`),
        },
        db,
      ),
    ).rejects.toThrow(/etiquetas/);
  });

  it('searches without caring about accents or case', async () => {
    await saveNote({ refTipo: 'libre', refId: 'x', titulo: 'Depreciación', contenido: 'Línea recta' }, db);
    await saveNote({ refTipo: 'libre', refId: 'x', titulo: 'Otro', contenido: 'nada' }, db);
    expect(await searchNotes('DEPRECIACION', db)).toHaveLength(1);
    expect(await searchNotes('linea', db)).toHaveLength(1);
    expect(await searchNotes('', db)).toHaveLength(2);
  });
});

describe('stars and collections', () => {
  it('toggles stars', async () => {
    expect(await toggleStar({ tipo: 'subtema', refId: 's1', titulo: 'S1' }, db)).toBe(true);
    expect(await isStarred('subtema', 's1', db)).toBe(true);
    expect(await listStars(db)).toHaveLength(1);
    expect(await toggleStar({ tipo: 'subtema', refId: 's1', titulo: 'S1' }, db)).toBe(false);
    expect(await isStarred('subtema', 's1', db)).toBe(false);
  });

  it('creates collections, avoids duplicates and keeps the student order', async () => {
    const col = await createCollection({ nombre: 'Fórmulas que olvido' }, db);
    await addToCollection(col.id, { tipo: 'formula', refId: 'a', titulo: 'A' }, db);
    await addToCollection(col.id, { tipo: 'formula', refId: 'b', titulo: 'B' }, db);
    await addToCollection(col.id, { tipo: 'formula', refId: 'a', titulo: 'A' }, db);
    let current = await moveInCollection(col.id, 1, 0, db);
    expect(current.items.map((i) => i.refId)).toEqual(['b', 'a']);
    current = await moveInCollection(col.id, 5, 0, db);
    expect(current.items).toHaveLength(2);
    current = await removeFromCollection(col.id, 'formula', 'b', db);
    expect(current.items.map((i) => i.refId)).toEqual(['a']);
    current = await updateCollection(col.id, { nombre: 'Renombrada', color: 'ocre' }, db);
    expect(current.nombre).toBe('Renombrada');
    expect(current.color).toBe('ocre');
    await deleteCollection(col.id, db);
    expect(await listCollections(db)).toHaveLength(0);
  });

  it('validates collection names and colors', async () => {
    await expect(createCollection({ nombre: '  ' }, db)).rejects.toThrow(ValidationError);
    await expect(createCollection({ nombre: 'x', color: 'neon' as never }, db)).rejects.toThrow(/Color/);
    await expect(
      addToCollection('no-existe', { tipo: 'formula', refId: 'a', titulo: 'A' }, db),
    ).rejects.toThrow(/ya no existe/);
  });

  it('shares a collection as a file without notes or device id, and imports it', async () => {
    await seed();
    const [col] = await listCollections(db);
    const text = exportCollection(col!);
    expect(text).not.toContain(await getDeviceId(db));
    expect(text).not.toContain('Debe = Haber');
    const newId = await importSharedCollection(text, db);
    expect(newId).not.toBe(col!.id);
    expect(await listCollections(db)).toHaveLength(2);
    await expect(importSharedCollection('{"formato":"otro"}', db)).rejects.toThrow(BackupError);
    await expect(importSharedCollection('no es json', db)).rejects.toThrow(BackupError);
  });
});

describe('reminders, attempts, sheets, searches and cache', () => {
  it('creates reminders ordered by date and marks them done', async () => {
    await createReminder({ titulo: 'B', fecha: '2026-12-01T10:00:00Z' }, db);
    const a = await createReminder(
      { titulo: 'A', fecha: '2026-11-01T10:00:00Z', materiaId: 'tributacion' },
      db,
    );
    expect((await listReminders(db)).map((r) => r.titulo)).toEqual(['A', 'B']);
    await setReminderDone(a.id, true, db);
    expect((await listReminders(db))[0]?.estado).toBe('hecho');
    await deleteReminder(a.id, db);
    expect(await listReminders(db)).toHaveLength(1);
    await expect(createReminder({ titulo: 'x', fecha: 'no es fecha' }, db)).rejects.toThrow(/fecha/);
    await expect(createReminder({ titulo: 'x', fecha: '2026-11-01', avisoMinutos: -5 }, db)).rejects.toThrow(
      /aviso/,
    );
  });

  it('records practice attempts', async () => {
    await recordAttempt({ ejercicioId: 'e1', respuesta: 1, correcto: false, segundos: 10.6 }, db);
    await recordAttempt({ ejercicioId: 'e1', respuesta: 2, correcto: true, segundos: 5 }, db);
    await recordAttempt({ ejercicioId: 'e2', respuesta: 2, correcto: true, segundos: 5 }, db);
    expect(await listAttempts('e1', db)).toHaveLength(2);
    expect(await listAttempts(undefined, db)).toHaveLength(3);
    await expect(
      recordAttempt({ ejercicioId: 'e1', respuesta: Number.NaN, correcto: false, segundos: 1 }, db),
    ).rejects.toThrow();
  });

  it('saves sheets', async () => {
    const sheet = await saveSheet(
      { nombre: 'Diario', celdas: { A1: '1' }, formatos: {}, sintaxis: 'es' },
      db,
    );
    const again = await saveSheet({ ...sheet, nombre: 'Diario 2' }, db);
    expect(again.id).toBe(sheet.id);
    expect(await listSheets(db)).toHaveLength(1);
    await deleteSheet(sheet.id, db);
    expect(await listSheets(db)).toHaveLength(0);
  });

  it('keeps a deduplicated search history', async () => {
    await recordSearch('VAN', 10, db);
    await recordSearch('van', 12, db);
    await recordSearch('   ', 0, db);
    expect(await listSearches(db)).toHaveLength(1);
    await clearSearches(db);
    expect(await listSearches(db)).toHaveLength(0);
  });

  it('expires cached API answers', async () => {
    await setCached('crossref:van', { n: 1 }, 1000, 0, db);
    expect(await getCached('crossref:van', 500, db)).toEqual({ n: 1 });
    expect(await getCached('crossref:van', 1500, db)).toBeUndefined();
    await setCached('a', 1, 10, 0, db);
    await setCached('b', 2, 10_000, 0, db);
    expect(await purgeExpiredCache(100, db)).toBe(1);
  });
});

describe('profile, device id and wipe', () => {
  it('returns defaults and stores changes', async () => {
    expect((await getProfile(db)).tema).toBe('system');
    await updateProfile({ tema: 'dark', sintaxisExcel: 'en' }, db);
    expect(await getProfile(db)).toMatchObject({ tema: 'dark', sintaxisExcel: 'en', movimiento: 'system' });
  });

  it('creates the anonymous id once', async () => {
    const first = await getDeviceId(db);
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(await getDeviceId(db)).toBe(first);
  });

  it('wipes everything, including the local id', async () => {
    await seed();
    const id = await getDeviceId(db);
    await wipeAllData(db);
    expect(Object.values(await countUserData(db)).every((n) => n === 0)).toBe(true);
    expect(await getDeviceId(db)).not.toBe(id);
  });
});

describe('T-05: schema migrations keep every note', () => {
  it('upgrades a version-1 database to version 2 without losing data', async () => {
    const legacyName = `abaco-legacy-${crypto.randomUUID()}`;
    const legacy = new Dexie(legacyName);
    legacy.version(1).stores(SCHEMA_V1);
    await legacy.open();
    await legacy.table('apuntes').bulkPut([
      {
        id: 'n1',
        asignaturaId: 'ucuenca-contabilidad-auditoria--c1-contabilidad-general',
        titulo: 'Cuentas',
        contenido: 'Activo = Pasivo + Patrimonio',
        creadoEn: '2026-01-01T00:00:00.000Z',
        actualizadoEn: '2026-01-02T00:00:00.000Z',
      },
      {
        id: 'n2',
        asignaturaId: 'otra',
        titulo: 'Segunda',
        contenido: 'Texto',
        creadoEn: '2026-01-01T00:00:00.000Z',
        actualizadoEn: '2026-01-03T00:00:00.000Z',
      },
    ]);
    await legacy.table('estrellas').put({
      id: 'formula:van',
      tipo: 'formula',
      refId: 'van',
      titulo: 'VAN',
      creadoEn: '2026-01-01T00:00:00.000Z',
    });
    await legacy.table('colecciones').put({
      id: 'c1',
      nombre: 'Examen',
      descripcion: '',
      color: 'carmin',
      items: [],
      creadoEn: '2026-01-01T00:00:00.000Z',
      actualizadoEn: '2026-01-01T00:00:00.000Z',
    });
    legacy.close();

    const upgraded = new AbacoDB(legacyName);
    await upgraded.open();
    expect(upgraded.verno).toBe(4);
    const notes = await listNotes({}, upgraded);
    expect(notes).toHaveLength(2);
    // A known curriculum subject becomes a catalog subject; an unknown one becomes a free note (nothing is lost).
    expect(notes.find((n) => n.id === 'n1')).toMatchObject({
      refTipo: 'materia',
      refId: 'contabilidad-general',
      contenido: 'Activo = Pasivo + Patrimonio',
      etiquetas: [],
    });
    expect(notes.find((n) => n.id === 'n2')).toMatchObject({
      refTipo: 'libre',
      refId: 'general',
      contenido: 'Texto',
    });
    expect(notes.every((n) => !('asignaturaId' in n))).toBe(true);
    expect(await listStars(upgraded)).toHaveLength(1);
    expect(await listCollections(upgraded)).toHaveLength(1);
    expect(await upgraded.hojas.count()).toBe(0);
    upgraded.close();
    await Dexie.delete(legacyName);
  });
});

describe('version 3: subject catalog instead of curricula', () => {
  it('upgrades a version-2 database: profile, notes, stars, collections and reminders follow the catalog', async () => {
    const legacyName = `abaco-v2-${crypto.randomUUID()}`;
    const legacy = new Dexie(legacyName);
    legacy.version(2).stores(SCHEMA_V2);
    await legacy.open();
    const t = '2026-09-01T00:00:00.000Z';
    await legacy.table('perfil').put({
      id: 'yo',
      universidad: 'u',
      carrera: 'c',
      ciclo: 3,
      tema: 'dark',
      movimiento: 'system',
      sintaxisExcel: 'es',
    });
    await legacy.table('apuntes').bulkPut([
      {
        id: 'n1',
        refTipo: 'asignatura',
        refId: 'ucacue-economia--c2-microeconomia-i',
        titulo: 'Oferta',
        contenido: 'x',
        etiquetas: [],
        creadoEn: t,
        actualizadoEn: t,
      },
      {
        id: 'n2',
        refTipo: 'subtema',
        refId: 'cg-ecuacion-elementos',
        titulo: '',
        contenido: 'y',
        etiquetas: [],
        creadoEn: t,
        actualizadoEn: t,
      },
    ]);
    await legacy.table('estrellas').put({
      id: 'asignatura:x',
      tipo: 'asignatura',
      refId: 'ucuenca-economia--c4-macroeconomia-ii',
      titulo: 'Macro',
      ruta: '/asignatura/x',
      creadoEn: t,
    });
    await legacy.table('colecciones').put({
      id: 'c1',
      nombre: 'Parcial',
      descripcion: '',
      color: 'jade',
      creadoEn: t,
      actualizadoEn: t,
      items: [{ tipo: 'asignatura', refId: 'algo-sin-equivalente', titulo: 'Rara', agregadoEn: t }],
    });
    await legacy.table('recordatorios').put({
      id: 'r1',
      titulo: 'Examen',
      asignaturaId: 'ucuenca-contabilidad-auditoria--c1-contabilidad-general',
      fecha: t,
      avisoMinutos: 60,
      estado: 'pendiente',
      creadoEn: t,
    });
    legacy.close();

    const upgraded = new AbacoDB(legacyName);
    await upgraded.open();
    expect(upgraded.verno).toBe(4);
    const profile = await getProfile(upgraded);
    // The old university-specific career and cycle are dropped; the new generic ones start empty.
    expect(profile).toMatchObject({ materias: [], carrera: null, ciclo: null, tema: 'dark' });
    expect('universidad' in profile).toBe(false);
    const stored = (await upgraded.table('perfil').get('yo')) as Record<string, unknown>;
    expect('carrera' in stored || 'universidad' in stored || 'ciclo' in stored).toBe(false);
    expect((await listNotes({}, upgraded)).find((n) => n.id === 'n1')).toMatchObject({
      refTipo: 'materia',
      refId: 'microeconomia',
    });
    expect((await listNotes({}, upgraded)).find((n) => n.id === 'n2')).toMatchObject({
      refTipo: 'subtema',
      refId: 'cg-ecuacion-elementos',
    });
    expect((await listStars(upgraded))[0]).toMatchObject({
      tipo: 'materia',
      refId: 'macroeconomia',
      ruta: '/materia/macroeconomia',
    });
    expect((await listCollections(upgraded))[0]?.items[0]).toMatchObject({
      tipo: 'materia',
      ruta: '/materias',
    });
    expect((await listReminders(upgraded))[0]).toMatchObject({ materiaId: 'contabilidad-general' });
    expect(await upgraded.documentos.count()).toBe(0);
    upgraded.close();
    await Dexie.delete(legacyName);
  });

  it('restores a version-2 backup file through the same migration', () => {
    const t = '2026-09-01T00:00:00.000Z';
    const v2 = {
      formato: 'abaco-respaldo',
      version: 2,
      exportadoEn: t,
      dispositivo: 'abc',
      datos: {
        perfil: [
          { id: 'yo', carrera: 'c', ciclo: 2, tema: 'light', movimiento: 'reduce', sintaxisExcel: 'en' },
        ],
        apuntes: [
          {
            id: 'n1',
            refTipo: 'asignatura',
            refId: 'x--c1-estadistica-descriptiva',
            titulo: 'T',
            contenido: 'C',
            etiquetas: [],
            creadoEn: t,
            actualizadoEn: t,
          },
        ],
        estrellas: [],
        colecciones: [],
        recordatorios: [],
        intentos: [],
        hojas: [],
        busquedas: [],
      },
    };
    const parsed = parseBackup(JSON.stringify(v2));
    expect(parsed.version).toBe(4);
    expect(parsed.datos.perfil[0]).toMatchObject({ materias: [], sintaxisExcel: 'en' });
    expect(parsed.datos.apuntes[0]).toMatchObject({ refTipo: 'materia', refId: 'estadistica-descriptiva' });
    expect(parsed.datos.documentos).toEqual([]);
  });
});

describe('T-06: backup and restore leave an identical state', () => {
  it('export → wipe → restore reproduces every table', async () => {
    await seed();
    const before = await createBackup(db);
    const text = serializeBackup(before);
    await wipeAllData(db);
    expect(Object.values(await countUserData(db)).every((n) => n === 0)).toBe(true);
    await restoreBackup(parseBackup(text), 'reemplazar', db);
    const after = await createBackup(db);
    expect(after.datos).toEqual(before.datos);
  });

  it('merging keeps existing data and adds the restored rows', async () => {
    await seed();
    const backup = await createBackup(db);
    await saveNote(
      { refTipo: 'libre', refId: 'nuevo', titulo: 'Nueva', contenido: 'Después del respaldo' },
      db,
    );
    await restoreBackup(backup, 'combinar', db);
    expect(await listNotes({}, db)).toHaveLength(3);
  });

  it('restores version-1 backup files through the same migration', async () => {
    const v1 = {
      formato: 'abaco-respaldo',
      version: 1,
      exportadoEn: '2026-05-01T12:00:00.000Z',
      dispositivo: 'abc',
      datos: {
        perfil: [{ id: 'yo', tema: 'light', movimiento: 'reduce' }],
        apuntes: [
          {
            id: 'n1',
            asignaturaId: 'a1',
            titulo: 'T',
            contenido: 'C',
            creadoEn: '2026-05-01T12:00:00.000Z',
            actualizadoEn: '2026-05-01T12:00:00.000Z',
          },
        ],
      },
    };
    const parsed = parseBackup(JSON.stringify(v1));
    expect(parsed.version).toBe(4);
    expect(parsed.datos.apuntes[0]).toMatchObject({ refTipo: 'libre', refId: 'general', etiquetas: [] });
    expect(parsed.datos.perfil[0]).toMatchObject({ materias: [] });
    await restoreBackup(parsed, 'reemplazar', db);
    expect((await getProfile(db)).movimiento).toBe('reduce');
  });

  it('rejects files that are not ÁBACO backups or are damaged', () => {
    expect(() => parseBackup('{')).toThrow(BackupError);
    expect(() => parseBackup('{"formato":"otro","version":2}')).toThrow(/respaldo válido/);
    expect(() =>
      parseBackup(
        JSON.stringify({
          formato: 'abaco-respaldo',
          version: 2,
          exportadoEn: '2026-01-01T00:00:00Z',
          dispositivo: 'x',
          datos: { apuntes: 'mal' },
        }),
      ),
    ).toThrow(BackupError);
  });

  it('a failed restore writes nothing (single transaction)', async () => {
    await seed();
    const backup = await createBackup(db);
    const broken = { ...backup, datos: { ...backup.datos, hojas: [{ id: null }] as never } };
    await expect(restoreBackup(broken, 'reemplazar', db)).rejects.toThrow();
    expect(await listNotes({}, db)).toHaveLength(2);
  });

  it('names backup files with the short local id and the date', async () => {
    expect(
      backupFileName({ dispositivo: '1b9d6bcd-bbfd-4b2d', exportadoEn: '2026-10-14T03:00:00.000Z' }),
    ).toBe('abaco-respaldo-1b9d6bcd-2026-10-14.json');
  });
});

describe('backup reminder every 15 days', () => {
  const now = new Date('2026-10-14T12:00:00Z');
  it('only reminds when there is data', () => {
    expect(needsBackupReminder(undefined, false, now)).toBe(false);
    expect(needsBackupReminder(undefined, true, now)).toBe(true);
    expect(needsBackupReminder('2026-10-01T12:00:00Z', true, now)).toBe(false);
    expect(needsBackupReminder('2026-09-29T12:00:00Z', true, now)).toBe(true);
    expect(needsBackupReminder('basura', true, now)).toBe(true);
  });

  it('reads the database state', async () => {
    expect(await shouldRemindBackup(db, now)).toBe(false);
    await seed();
    expect(await shouldRemindBackup(db, now)).toBe(true);
    await markBackupDone(db, now);
    expect(await shouldRemindBackup(db, now)).toBe(false);
  });
});

describe('storage health', () => {
  it('infers a private window from a tiny quota or a blocked IndexedDB', () => {
    expect(inferPrivateMode(100 * 1024 * 1024, true)).toBe(true);
    expect(inferPrivateMode(2 * 1024 * 1024 * 1024, true)).toBe(false);
    expect(inferPrivateMode(null, true)).toBe(false);
    expect(inferPrivateMode(null, false)).toBe(true);
  });

  it('reads the storage estimate when available', async () => {
    const nav = {
      storage: {
        estimate: async () => ({ usage: 2048, quota: 4 * 1024 * 1024 * 1024 }),
        persisted: async () => true,
        persist: async () => true,
      },
    } as unknown as Navigator;
    const status = await checkStorage(nav, indexedDB);
    expect(status).toMatchObject({
      indexedDb: 'ok',
      usoBytes: 2048,
      persistente: true,
      posibleIncognito: false,
    });
    expect(await requestPersistence(nav)).toBe(true);
    expect(await requestPersistence(null)).toBe(false);
  });

  it('reports a blocked IndexedDB', async () => {
    const status = await checkStorage(null, null);
    expect(status.indexedDb).toBe('bloqueado');
    expect(status.posibleIncognito).toBe(true);
  });

  it('turns storage exceptions into actionable messages', () => {
    expect(describeStorageError({ name: 'QuotaExceededError' })).toMatch(/lleno/);
    expect(describeStorageError({ name: 'AbortError', inner: { name: 'QuotaExceededError' } })).toMatch(
      /lleno/,
    );
    expect(describeStorageError({ name: 'InvalidStateError' })).toMatch(/incógnito/);
    expect(describeStorageError(new ValidationError('Escribe algo.'))).toBe('Escribe algo.');
    expect(describeStorageError(new Error('x'))).toMatch(/No se pudo guardar/);
  });

  it('formats byte counts', () => {
    expect(formatBytes(null)).toBe('desconocido');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatBytes(3 * 1024 * 1024 * 1024)).toBe('3.0 GB');
  });
});

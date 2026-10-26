import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { createBackup, parseBackup, restoreBackup, serializeBackup } from '../../src/data/backup';
import { AbacoDB, SCHEMA_V3 } from '../../src/data/db';
import {
  deletePdf,
  listExams,
  listPdfs,
  saveExam,
  savePdf,
  STUDY_LIMITS,
} from '../../src/data/study-repositories';

const opened: Dexie[] = [];
const fresh = () => {
  const db = new AbacoDB(`abaco-study-${crypto.randomUUID()}`);
  opened.push(db);
  return db;
};
afterEach(async () => {
  for (const db of opened.splice(0)) {
    db.close();
    await Dexie.delete(db.name);
  }
});

describe('versión 4: área de estudio', () => {
  it('upgrades a version-3 database without touching existing data', async () => {
    const name = `abaco-v3-${crypto.randomUUID()}`;
    const legacy = new Dexie(name);
    legacy.version(3).stores(SCHEMA_V3);
    await legacy.open();
    await legacy.table('apuntes').put({
      id: 'n1',
      refTipo: 'materia',
      refId: 'tributacion',
      titulo: 'IVA',
      contenido: 'x',
      etiquetas: [],
      creadoEn: '2026-10-01T00:00:00.000Z',
      actualizadoEn: '2026-10-01T00:00:00.000Z',
    });
    legacy.close();
    const db = new AbacoDB(name);
    opened.push(db);
    await db.open();
    expect(db.verno).toBe(5);
    expect(await db.apuntes.get('n1')).toMatchObject({ titulo: 'IVA' });
    expect(await db.pdfs.count()).toBe(0);
    expect(await db.examenes.count()).toBe(0);
  });

  it('keeps PDF texts and exams per subject, newest first', async () => {
    const db = fresh();
    const a = await savePdf({ nombre: 'a.pdf', materiaId: 'tributacion', paginas: 2, texto: 'uno' }, db);
    await savePdf({ nombre: 'b.pdf', materiaId: 'microeconomia', paginas: 1, texto: 'dos' }, db);
    expect((await listPdfs('tributacion', db)).map((p) => p.nombre)).toEqual(['a.pdf']);
    await deletePdf(a.id, db);
    expect(await listPdfs('tributacion', db)).toEqual([]);
    await saveExam(
      { materiaId: 'tributacion', fuentes: 'abaco', total: 10, correctas: 7, segundos: 300 },
      db,
    );
    expect((await listExams('tributacion', db))[0]).toMatchObject({ correctas: 7, total: 10 });
    await expect(
      saveExam({ materiaId: 'tributacion', fuentes: 'abaco', total: 5, correctas: 6, segundos: 1 }, db),
    ).rejects.toThrow();
  });

  it('limits how many PDFs a device keeps', async () => {
    const db = fresh();
    for (let i = 0; i < STUDY_LIMITS.pdfs; i++)
      await savePdf({ nombre: `${i}.pdf`, materiaId: 'tributacion', paginas: 1, texto: 't' }, db);
    await expect(
      savePdf({ nombre: 'extra.pdf', materiaId: 'tributacion', paginas: 1, texto: 't' }, db),
    ).rejects.toThrow(/hasta 30/);
  });

  it('backs up and restores PDF texts and exams, and accepts version-3 files', async () => {
    const source = fresh();
    await savePdf(
      { nombre: 'apuntes.pdf', materiaId: 'tributacion', paginas: 3, texto: 'El IVA es un impuesto.' },
      source,
    );
    await saveExam(
      { materiaId: 'tributacion', fuentes: 'mixto', total: 5, correctas: 4, segundos: 90 },
      source,
    );
    const backup = await createBackup(source);
    expect(backup.version).toBe(5);
    const target = fresh();
    await restoreBackup(parseBackup(serializeBackup(backup)), 'reemplazar', target);
    expect(await target.pdfs.count()).toBe(1);
    expect(await target.examenes.count()).toBe(1);

    const v3 = { ...backup, version: 3, datos: { ...backup.datos } } as Record<string, unknown>;
    delete (v3.datos as Record<string, unknown>).pdfs;
    delete (v3.datos as Record<string, unknown>).examenes;
    const migrated = parseBackup(JSON.stringify(v3));
    expect(migrated.version).toBe(5);
    expect(migrated.datos.pdfs).toEqual([]);
  });

  it('rejects a backup with a PDF text over the limit', async () => {
    const source = fresh();
    const backup = await createBackup(source);
    const tampered = {
      ...backup,
      datos: {
        ...backup.datos,
        pdfs: [
          {
            id: 'x',
            nombre: 'x.pdf',
            materiaId: 'tributacion',
            paginas: 1,
            texto: 'a'.repeat(400_001),
            creadoEn: '2026-10-26T00:00:00.000Z',
          },
        ],
      },
    };
    expect(() => parseBackup(JSON.stringify(tampered))).toThrow(/no es un respaldo válido/);
  });
});

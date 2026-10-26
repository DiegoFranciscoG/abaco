import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { createBackup, parseBackup, restoreBackup, serializeBackup } from '../../src/data/backup';
import { AbacoDB, SCHEMA_V4 } from '../../src/data/db';
import {
  countUsage,
  deleteCalificacion,
  deleteEntregable,
  dueMistakes,
  EVERYDAY_LIMITS,
  getCalificacion,
  hardSubtopics,
  listCalificaciones,
  listEntregables,
  listMistakes,
  listUsage,
  recordFailedQuestions,
  reviewMistake,
  saveCalificacion,
  saveEntregable,
} from '../../src/data/everyday-repositories';
import { countUserData, wipeAllData } from '../../src/data/repositories';
import type { Question } from '../../src/domain/study/quiz';

const opened: Dexie[] = [];
const fresh = () => {
  const db = new AbacoDB(`abaco-everyday-${crypto.randomUUID()}`);
  opened.push(db);
  return db;
};
afterEach(async () => {
  for (const db of opened.splice(0)) {
    db.close();
    await Dexie.delete(db.name);
  }
});

const question = (id: string, subtema?: { id: string; nombre: string }): Question => ({
  id,
  tipo: 'opcion',
  enunciado: '¿Qué subtema ilustra este ejemplo?',
  opciones: ['A', 'B', 'C', 'D'],
  correcta: 2,
  explicacion: 'Porque sí.',
  origen: 'abaco',
  ...(subtema ? { subtema } : {}),
});

describe('versión 5: herramientas de todos los días', () => {
  it('upgrades a version-4 database keeping the study area data', async () => {
    const name = `abaco-v4-${crypto.randomUUID()}`;
    const legacy = new Dexie(name);
    legacy.version(4).stores(SCHEMA_V4);
    await legacy.open();
    await legacy.table('examenes').put({
      id: 'e1',
      materiaId: 'tributacion',
      fuentes: 'abaco',
      total: 5,
      correctas: 3,
      segundos: 60,
      fecha: '2026-10-20T10:00:00.000Z',
    });
    legacy.close();
    const db = new AbacoDB(name);
    opened.push(db);
    await db.open();
    expect(db.verno).toBe(5);
    expect(await db.examenes.get('e1')).toMatchObject({ correctas: 3 });
    expect(await db.calificaciones.count()).toBe(0);
  });

  it('keeps one grade plan per subject and period, and cleans names and grades', async () => {
    const db = fresh();
    const first = await saveCalificacion(
      {
        materiaId: 'contabilidad-general',
        periodo: ' 2026-2 ',
        notaMaxima: 10,
        objetivo: 12,
        componentes: [
          { id: '', nombre: '  ', peso: 40, nota: 15 },
          { id: 'c2', nombre: 'Final', peso: 60, nota: null },
        ],
      },
      db,
    );
    expect(first.periodo).toBe('2026-2');
    expect(first.objetivo).toBe(10);
    expect(first.componentes[0]).toMatchObject({ nombre: 'Componente 1', nota: 10 });
    expect(first.componentes[0]?.id).not.toBe('');
    const again = await saveCalificacion(
      { ...first, componentes: [{ id: 'c2', nombre: 'Final', peso: 100, nota: 8 }] },
      db,
    );
    expect(again.id).toBe(first.id);
    expect(again.creadoEn).toBe(first.creadoEn);
    expect(await listCalificaciones(db)).toHaveLength(1);
    expect(await getCalificacion('contabilidad-general', '2026-2', db)).toMatchObject({
      componentes: [{ nota: 8 }],
    });
    await expect(saveCalificacion({ ...first, periodo: '  ', componentes: [] }, db)).rejects.toThrow(
      /período/,
    );
    await deleteCalificacion(first.id, db);
    expect(await listCalificaciones(db)).toEqual([]);
  });

  it('failed questions are due right away, come back after each mistake and leave once mastered', async () => {
    const db = fresh();
    const t0 = new Date('2026-10-26T10:00:00.000Z');
    await recordFailedQuestions(
      'tributacion',
      [
        question('ej:tr-iva-tarifas', { id: 'tr-iva-tarifas', nombre: 'Tarifas del IVA' }),
        question('pdf:1:x'),
      ],
      db,
      t0,
    );
    let rows = await listMistakes('tributacion', db);
    expect(rows).toHaveLength(2);
    expect(dueMistakes(rows, t0)).toHaveLength(2);

    // Failing it again in another exam restarts its schedule and counts the mistake.
    await recordFailedQuestions(
      'tributacion',
      [question('ej:tr-iva-tarifas', { id: 'tr-iva-tarifas', nombre: 'Tarifas del IVA' })],
      db,
      t0,
    );
    expect(await db.errores.get('ej:tr-iva-tarifas')).toMatchObject({ fallos: 2, repeticiones: 0 });

    // Three right answers in a row (days 0, 1 and 7) master it.
    let r = await reviewMistake('ej:tr-iva-tarifas', true, db, t0);
    expect(r).toMatchObject({ intervalo: 1, dominada: false, aciertos: 1 });
    r = await reviewMistake('ej:tr-iva-tarifas', true, db, new Date('2026-10-27T10:00:00.000Z'));
    expect(r).toMatchObject({ intervalo: 6, dominada: false });
    r = await reviewMistake('ej:tr-iva-tarifas', true, db, new Date('2026-11-02T10:00:00.000Z'));
    expect(r).toMatchObject({ dominada: true, repeticiones: 3 });

    rows = await listMistakes(undefined, db);
    expect(dueMistakes(rows, new Date('2027-06-01T00:00:00.000Z')).map((e) => e.id)).toEqual(['pdf:1:x']);
    expect(hardSubtopics(rows)).toEqual([]);
    expect(await reviewMistake('no-existe', true, db)).toBeUndefined();
  });

  it('ranks the subtopics the student fails the most', () => {
    const base = {
      materiaId: 'm',
      pregunta: question('x'),
      aciertos: 0,
      ef: 2.5,
      intervalo: 1,
      repeticiones: 0,
    };
    const dates = {
      proximaRevision: '2026-10-26T00:00:00.000Z',
      creadoEn: '2026-10-26T00:00:00.000Z',
      actualizadoEn: '2026-10-26T00:00:00.000Z',
    };
    const rows = [
      { ...base, ...dates, id: 'a', subtemaId: 's1', subtemaNombre: 'Kardex', fallos: 1, dominada: false },
      { ...base, ...dates, id: 'b', subtemaId: 's2', subtemaNombre: 'IVA', fallos: 3, dominada: false },
      { ...base, ...dates, id: 'c', subtemaId: 's1', subtemaNombre: 'Kardex', fallos: 4, dominada: true },
      { ...base, ...dates, id: 'd', subtemaId: null, subtemaNombre: null, fallos: 9, dominada: false },
    ];
    expect(hardSubtopics(rows)).toEqual([
      { subtemaId: 's1', nombre: 'Kardex', fallos: 5, pendientes: 1 },
      { subtemaId: 's2', nombre: 'IVA', fallos: 3, pendientes: 1 },
    ]);
  });

  it('saves deliverables to resume them and counts usage per day', async () => {
    const db = fresh();
    const d = await saveEntregable({ tipo: 'amortizacion', titulo: '  ', entradas: { monto: 12000 } }, db);
    expect(d.titulo).toBe('Sin título');
    const updated = await saveEntregable(
      { id: d.id, tipo: 'amortizacion', titulo: 'Préstamo', entradas: { monto: 15000 } },
      db,
    );
    expect(updated.id).toBe(d.id);
    expect(await listEntregables('amortizacion', db)).toHaveLength(1);
    expect(await listEntregables('kardex', db)).toEqual([]);
    await countUsage('entregable', db, new Date(2026, 9, 26, 9));
    await countUsage('entregable', db, new Date(2026, 9, 26, 18));
    await countUsage('apertura', db, new Date(2026, 9, 27, 8));
    expect(await listUsage(db)).toEqual([
      { dia: '2026-10-26', eventos: { entregable: 2 } },
      { dia: '2026-10-27', eventos: { apertura: 1 } },
    ]);
    await deleteEntregable(d.id, db);
    expect(await listEntregables(undefined, db)).toEqual([]);
    expect(EVERYDAY_LIMITS.masteredAfter).toBe(3);
  });

  it('backs up and restores the new tables, and migrates version 4 files with empty lists', async () => {
    const source = fresh();
    await saveCalificacion(
      {
        materiaId: 'tributacion',
        periodo: '2026-2',
        notaMaxima: 10,
        objetivo: 7,
        componentes: [{ id: 'a', nombre: 'Final', peso: 100, nota: null }],
      },
      source,
    );
    await recordFailedQuestions(
      'tributacion',
      [question('ej:x', { id: 'tr-iva-tarifas', nombre: 'Tarifas del IVA' })],
      source,
    );
    await saveEntregable({ tipo: 'kardex', titulo: 'Inventario', entradas: { metodo: 'promedio' } }, source);
    await countUsage('examen', source);
    expect(await countUserData(source)).toMatchObject({ calificaciones: 1, errores: 1, entregables: 1 });

    const backup = parseBackup(serializeBackup(await createBackup(source)));
    expect(backup.version).toBe(5);
    const target = fresh();
    await restoreBackup(backup, 'reemplazar', target);
    expect(await target.calificaciones.count()).toBe(1);
    expect(await target.errores.get('ej:x')).toMatchObject({ subtemaNombre: 'Tarifas del IVA' });
    expect(await target.entregables.count()).toBe(1);
    expect(await target.uso.count()).toBe(1);

    const v4 = { ...backup, version: 4, datos: { ...backup.datos } } as Record<string, unknown>;
    for (const table of ['calificaciones', 'errores', 'entregables', 'uso']) {
      delete (v4.datos as Record<string, unknown>)[table];
    }
    const migrated = parseBackup(JSON.stringify(v4));
    expect(migrated.version).toBe(5);
    expect(migrated.datos.calificaciones).toEqual([]);
    expect(migrated.datos.uso).toEqual([]);

    const broken = { ...backup, datos: { ...backup.datos, errores: [{ id: 'x' }] } };
    expect(() => parseBackup(JSON.stringify(broken))).toThrow(/errores/);

    await wipeAllData(target);
    expect(await target.calificaciones.count()).toBe(0);
    expect(await target.uso.count()).toBe(0);
  });
});

import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createBackup, parseBackup, restoreBackup, serializeBackup } from '../../src/data/backup';
import { AbacoDB } from '../../src/data/db';
import { countUserData, ValidationError, wipeAllData } from '../../src/data/repositories';
import {
  addCards,
  addEntry,
  createJournal,
  deleteBoard,
  deleteDeck,
  deleteDocument,
  deleteEntry,
  dueCards,
  listBoards,
  listDecks,
  listDocuments,
  listJournals,
  reviewCard,
  saveBoard,
  saveDocument,
  TOOL_LIMITS,
} from '../../src/data/tool-repositories';

let db: AbacoDB;
let name: string;

beforeEach(() => {
  name = `abaco-tools-${crypto.randomUUID()}`;
  db = new AbacoDB(name);
});

afterEach(async () => {
  db.close();
  await Dexie.delete(name);
});

describe('report documents', () => {
  it('saves, updates (keeping the creation date) and deletes', async () => {
    const doc = await saveDocument({ titulo: '  Informe  ', contenido: '# Hola' }, db);
    expect(doc.titulo).toBe('Informe');
    const updated = await saveDocument(
      { id: doc.id, titulo: 'Informe final', contenido: '# Hola\n\nTexto' },
      db,
    );
    expect(updated.creadoEn).toBe(doc.creadoEn);
    expect(await listDocuments(db)).toHaveLength(1);
    await deleteDocument(doc.id, db);
    expect(await listDocuments(db)).toHaveLength(0);
  });

  it('rejects documents above the size limit', async () => {
    await expect(
      saveDocument({ titulo: 'x', contenido: 'a'.repeat(TOOL_LIMITS.documentBody + 1) }, db),
    ).rejects.toThrow(ValidationError);
  });
});

describe('journals', () => {
  it('only stores balanced entries, sorted by date', async () => {
    const j = await createJournal('Ejercicio 1', db);
    await addEntry(
      j.id,
      {
        fecha: '2026-02-01',
        glosa: 'Venta',
        lineas: [
          { cuenta: 'Caja', tipo: 'activo', debe: 50, haber: 0 },
          { cuenta: 'Ventas', tipo: 'ingreso', debe: 0, haber: 50 },
        ],
      },
      db,
    );
    const next = await addEntry(
      j.id,
      {
        fecha: '2026-01-15',
        glosa: 'Aporte',
        lineas: [
          { cuenta: 'Caja', tipo: 'activo', debe: 100, haber: 0 },
          { cuenta: 'Capital', tipo: 'patrimonio', debe: 0, haber: 100 },
        ],
      },
      db,
    );
    expect(next.asientos.map((a) => a.glosa)).toEqual(['Aporte', 'Venta']);
    await expect(
      addEntry(
        j.id,
        {
          fecha: '2026-03-01',
          glosa: '',
          lineas: [
            { cuenta: 'Caja', tipo: 'activo', debe: 10, haber: 0 },
            { cuenta: 'Capital', tipo: 'patrimonio', debe: 0, haber: 9 },
          ],
        },
        db,
      ),
    ).rejects.toThrow(/No cuadra/);
    await expect(addEntry(j.id, { fecha: 'mañana', glosa: '', lineas: [] }, db)).rejects.toThrow(/fecha/);
    await deleteEntry(j.id, next.asientos[0]!.id, db);
    expect((await listJournals(db))[0]?.asientos).toHaveLength(1);
  });
});

describe('flashcards', () => {
  it('imports idempotently and schedules reviews with SM-2', async () => {
    const cards = [
      {
        id: 'glosario:activo',
        mazo: 'Glosario',
        frente: 'Activo',
        reverso: 'Recurso controlado',
        origen: 'glosario' as const,
      },
      {
        id: 'glosario:pasivo',
        mazo: 'Glosario',
        frente: 'Pasivo',
        reverso: 'Obligación presente',
        origen: 'glosario' as const,
      },
    ];
    expect(await addCards(cards, db)).toBe(2);
    expect(await addCards(cards, db)).toBe(0);
    expect((await listDecks(db))[0]).toMatchObject({ mazo: 'Glosario', total: 2, pendientes: 2 });
    const now = new Date(Date.now() + 60_000);
    const reviewed = await reviewCard('glosario:activo', 5, now, db);
    expect(reviewed.proximaRevision).toBe(new Date(now.getTime() + 86_400_000).toISOString());
    expect((await dueCards('Glosario', now, db)).map((c) => c.id)).toEqual(['glosario:pasivo']);
    await deleteDeck('Glosario', db);
    expect(await listDecks(db)).toEqual([]);
  });

  it('validates card text', async () => {
    await expect(addCards([{ mazo: 'M', frente: ' ', reverso: 'x', origen: 'propia' }], db)).rejects.toThrow(
      ValidationError,
    );
  });
});

describe('boards', () => {
  it('saves a SWOT board with trimmed, bounded lists', async () => {
    const board = await saveBoard(
      {
        tipo: 'foda',
        titulo: 'FODA',
        foda: { fortalezas: ['  Equipo  '], oportunidades: [], debilidades: [], amenazas: [] },
      },
      db,
    );
    expect(board.foda?.fortalezas).toEqual(['Equipo']);
    expect(await listBoards(db)).toHaveLength(1);
    await deleteBoard(board.id, db);
    expect(await listBoards(db)).toHaveLength(0);
  });
});

describe('tool data travels in backups and is erased with everything else', () => {
  it('export → wipe → restore keeps documents, journals, cards and boards', async () => {
    await saveDocument({ titulo: 'Informe', contenido: '$$x$$' }, db);
    const j = await createJournal('Libro', db);
    await addEntry(
      j.id,
      {
        fecha: '2026-01-01',
        glosa: 'Aporte',
        lineas: [
          { cuenta: 'Caja', tipo: 'activo', debe: 1, haber: 0 },
          { cuenta: 'Capital', tipo: 'patrimonio', debe: 0, haber: 1 },
        ],
      },
      db,
    );
    await addCards([{ mazo: 'M', frente: 'F', reverso: 'R', origen: 'propia' }], db);
    await saveBoard(
      {
        tipo: 'decision',
        titulo: 'Proveedor',
        decision: { criterios: [{ nombre: 'Costo', peso: 100 }], opciones: ['A'], puntajes: [[7]] },
      },
      db,
    );
    const before = await createBackup(db);
    expect(before.version).toBe(5);
    await wipeAllData(db);
    expect(Object.values(await countUserData(db)).every((n) => n === 0)).toBe(true);
    await restoreBackup(parseBackup(serializeBackup(before)), 'reemplazar', db);
    expect((await createBackup(db)).datos).toEqual(before.datos);
  });

  it('rejects a backup whose journal entry has an invalid account type', () => {
    const t = '2026-01-01T00:00:00.000Z';
    const bad = {
      formato: 'abaco-respaldo',
      version: 3,
      exportadoEn: t,
      dispositivo: 'x',
      datos: {
        perfil: [],
        apuntes: [],
        estrellas: [],
        colecciones: [],
        recordatorios: [],
        intentos: [],
        hojas: [],
        busquedas: [],
        documentos: [],
        tarjetas: [],
        tableros: [],
        diarios: [
          {
            id: 'd',
            nombre: 'L',
            creadoEn: t,
            actualizadoEn: t,
            asientos: [
              {
                id: 'a',
                fecha: '2026-01-01',
                glosa: '',
                lineas: [
                  { cuenta: 'X', tipo: 'otro', debe: 1, haber: 0 },
                  { cuenta: 'Y', tipo: 'activo', debe: 0, haber: 1 },
                ],
              },
            ],
          },
        ],
      },
    };
    expect(() => parseBackup(JSON.stringify(bad))).toThrow(/respaldo válido/);
  });
});

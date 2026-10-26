import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import {
  COLLECTION_LINK_MAX,
  decodeCollectionLink,
  encodeCollectionLink,
  exportCollection,
  importSharedCollection,
  parseSharedCollection,
} from '../../src/data/backup';
import { AbacoDB } from '../../src/data/db';
import { getDeviceId, saveNote } from '../../src/data/repositories';
import type { Coleccion } from '../../src/data/types';

const opened: Dexie[] = [];
const fresh = () => {
  const db = new AbacoDB(`abaco-share-${crypto.randomUUID()}`);
  opened.push(db);
  return db;
};
afterEach(async () => {
  for (const db of opened.splice(0)) {
    db.close();
    await Dexie.delete(db.name);
  }
});

const collection: Coleccion = {
  id: 'coleccion-interna-123',
  nombre: 'Parcial de costos',
  descripcion: 'Lo que entra el jueves',
  color: 'jade',
  items: [
    {
      tipo: 'formula',
      refId: 'punto-equilibrio-unidades',
      titulo: 'Punto de equilibrio',
      ruta: '/formulas/punto-equilibrio-unidades',
      agregadoEn: '2026-10-20T08:00:00.000Z',
    },
    {
      tipo: 'subtema',
      refId: 'cc-margen-contribucion',
      titulo: 'Margen de contribución',
      ruta: '/materia/contabilidad-costos/tema/cc-cvu?s=cc-margen-contribucion',
      agregadoEn: '2026-10-21T09:00:00.000Z',
    },
  ],
  creadoEn: '2026-10-20T08:00:00.000Z',
  actualizadoEn: '2026-10-21T09:00:00.000Z',
};

/** T-18: a shared collection carries only what the student chose, never notes or local identifiers. */
describe('T-18: compartir no filtra', () => {
  it('the shared file has only the name, description, color and items, without dates or ids', async () => {
    const db = fresh();
    const deviceId = await getDeviceId(db);
    await saveNote(
      {
        refTipo: 'formula',
        refId: 'punto-equilibrio-unidades',
        titulo: 'Mi truco secreto',
        contenido: 'Nota privada del estudiante',
        etiquetas: [],
      },
      db,
    );
    const text = exportCollection(collection);
    const shared = JSON.parse(text);
    expect(Object.keys(shared).sort()).toEqual(['coleccion', 'formato', 'version']);
    expect(Object.keys(shared.coleccion).sort()).toEqual(['color', 'descripcion', 'items', 'nombre']);
    for (const item of shared.coleccion.items)
      expect(Object.keys(item).sort()).toEqual(['refId', 'ruta', 'tipo', 'titulo']);
    for (const secret of [
      deviceId,
      'coleccion-interna-123',
      'Mi truco secreto',
      'Nota privada',
      '2026-10-20',
      '2026-10-21',
    ]) {
      expect(text).not.toContain(secret);
    }
  });

  it('a link carries the same minimal data and opens on another device', async () => {
    const encoded = encodeCollectionLink(collection)!;
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    const decoded = decodeCollectionLink(encoded);
    expect(decoded).toEqual(JSON.parse(exportCollection(collection)).coleccion);
    expect(atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))).not.toContain('coleccion-interna-123');
    const db = fresh();
    const id = await importSharedCollection(exportCollection(collection), db);
    const saved = await db.colecciones.get(id);
    expect(saved).toMatchObject({ nombre: 'Parcial de costos', color: 'jade' });
    expect(saved!.id).not.toBe('coleccion-interna-123');
    expect(saved!.items).toHaveLength(2);
  });

  it('long collections go as a file and broken or hostile links are rejected', () => {
    const big = {
      ...collection,
      items: Array.from({ length: 300 }, (_, i) => ({
        ...collection.items[0]!,
        refId: `f-${i}`,
        titulo: `Elemento ${i} con un título largo para llenar el enlace`,
      })),
    };
    expect(encodeCollectionLink(big)).toBeNull();
    expect(() => decodeCollectionLink('no es base64!')).toThrow(/incompleto o dañado/);
    expect(() => decodeCollectionLink('A'.repeat(COLLECTION_LINK_MAX + 1))).toThrow(/incompleto o dañado/);
    const hostile = JSON.stringify({
      formato: 'abaco-coleccion',
      version: 2,
      coleccion: {
        nombre: 'Trampa',
        descripcion: '',
        color: 'jade',
        items: [
          { tipo: 'formula', refId: 'x', titulo: 'Clic aquí', ruta: 'https://sitio-falso.example/login' },
        ],
      },
    });
    expect(() => parseSharedCollection(hostile)).toThrow(/no es una colección válida/);
    const protocolRelative = hostile.replace('https://sitio-falso.example/login', '//sitio-falso.example');
    expect(() => parseSharedCollection(protocolRelative)).toThrow(/no es una colección válida/);
  });

  it('files from the previous version are still accepted, without their dates', () => {
    const v1 = JSON.stringify({
      formato: 'abaco-coleccion',
      version: 1,
      coleccion: { ...collection, id: undefined },
    });
    const data = parseSharedCollection(v1);
    expect(data.items[0]).not.toHaveProperty('agregadoEn');
    expect(data.nombre).toBe('Parcial de costos');
  });
});

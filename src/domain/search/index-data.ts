/**
 * Shared by the build script (Node, type stripping) and the app: it must stay free of runtime imports so
 * `node scripts/build-search-index.ts` can load it directly. Only type imports are allowed here.
 */
import type { App, Carrera, Ejercicio, Formula, Materia, Temario, Termino } from '../content/schemas';

export type SearchDocType =
  'carrera' | 'materia' | 'tema' | 'subtema' | 'formula' | 'herramienta' | 'termino' | 'app' | 'ejercicio';

export interface SearchDoc {
  id: string;
  tipo: SearchDocType;
  titulo: string;
  texto: string;
  claves: string;
  ruta: string;
  extracto: string;
  area: string;
}

const STOPWORDS = new Set([
  'a',
  'al',
  'con',
  'de',
  'del',
  'el',
  'en',
  'es',
  'la',
  'las',
  'lo',
  'los',
  'o',
  'para',
  'por',
  'que',
  'se',
  'su',
  'un',
  'una',
  'y',
]);

export function normalizeTerm(term: string): string | null {
  const value = term
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
  if (!value || STOPWORDS.has(value)) return null;
  return value;
}

export const SEARCH_OPTIONS = {
  idField: 'id',
  fields: ['titulo', 'texto', 'claves'],
  storeFields: ['tipo', 'titulo', 'ruta', 'extracto', 'area'],
  processTerm: normalizeTerm,
  searchOptions: {
    boost: { titulo: 3, claves: 2 },
    prefix: true,
    fuzzy: 0.2,
    combineWith: 'AND' as const,
  },
};

const excerpt = (text: string, max = 140): string =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
const functionNames = (formula: string): string[] =>
  formula.match(/[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9.]*(?=\()/g) ?? [];

/** Study tool as listed in the search (the tool catalog lives in src/domain/tools/catalog.ts). */
export interface SearchTool {
  id: string;
  nombre: string;
  descripcion: string;
  claves: string;
  ruta: string;
  area: string;
}

export interface SearchContent {
  carreras: Carrera[];
  materias: Materia[];
  temarios: Temario[];
  formulas: Formula[];
  glosario: Termino[];
  apps: App[];
  ejercicios: Ejercicio[];
  herramientas: SearchTool[];
}

export function buildSearchDocuments(content: SearchContent): SearchDoc[] {
  const docs: SearchDoc[] = [];
  const materiaById = new Map(content.materias.map((m) => [m.id, m]));

  for (const c of content.carreras) {
    const nombres = c.materias.map((e) => materiaById.get(e.materia)?.nombre ?? '').filter(Boolean);
    docs.push({
      id: `carrera:${c.id}`,
      tipo: 'carrera',
      titulo: c.nombre,
      texto: `${c.descripcion} ${nombres.join(' ')}`,
      claves: 'carrera ciclo materias',
      ruta: `/materias?carrera=${c.id}`,
      extracto: `${c.ciclos} ciclos · ${c.materias.length} materias del catálogo`,
      area: 'formacion',
    });
  }

  for (const m of content.materias) {
    docs.push({
      id: `materia:${m.id}`,
      tipo: 'materia',
      titulo: m.nombre,
      texto: m.descripcion,
      claves: `${m.sinonimos.join(' ')} materia`,
      ruta: `/materia/${m.id}`,
      extracto: excerpt(m.descripcion),
      area: m.areas[0] ?? 'gestion',
    });
  }

  for (const temario of content.temarios) {
    const materia = materiaById.get(temario.materia);
    for (const tema of temario.temas) {
      docs.push({
        id: `tema:${tema.id}`,
        tipo: 'tema',
        titulo: tema.nombre,
        texto: `${tema.descripcion} ${tema.subtemas.map((s) => s.nombre).join(' ')}`,
        claves: materia?.nombre ?? '',
        ruta: `/materia/${temario.materia}/tema/${tema.id}`,
        extracto: `${materia?.nombre ?? ''} · ${tema.descripcion}`,
        area: materia?.areas[0] ?? 'gestion',
      });
      for (const s of tema.subtemas) {
        docs.push({
          id: `subtema:${s.id}`,
          tipo: 'subtema',
          titulo: s.nombre,
          texto: `${s.explicacion} ${s.puntos_clave.join(' ')}`,
          claves: `${tema.nombre} ${materia?.nombre ?? ''}`,
          ruta: `/materia/${temario.materia}/tema/${tema.id}?s=${s.id}`,
          extracto: excerpt(s.explicacion),
          area: materia?.areas[0] ?? 'gestion',
        });
      }
    }
  }

  for (const tool of content.herramientas) {
    docs.push({
      id: `herramienta:${tool.id}`,
      tipo: 'herramienta',
      titulo: tool.nombre,
      texto: tool.descripcion,
      claves: `${tool.claves} herramienta`,
      ruta: tool.ruta,
      extracto: excerpt(tool.descripcion),
      area: tool.area,
    });
  }

  for (const f of content.formulas) {
    if (f.estado === 'pendiente') continue;
    const names = [...functionNames(f.excel.es), ...functionNames(f.excel.en)];
    docs.push({
      id: `formula:${f.id}`,
      tipo: 'formula',
      titulo: f.nombre,
      texto: `${f.descripcion} ${f.variables.map((v) => v.significado).join(' ')}`,
      claves: `${[...new Set(names)].join(' ')} ${f.categoria.replace(/-/g, ' ')} ${f.variables.map((v) => v.nombre).join(' ')}`,
      ruta: `/formulas/${f.id}`,
      extracto: excerpt(f.descripcion),
      area: f.areas[0] ?? 'finanzas',
    });
  }

  for (const t of content.glosario) {
    docs.push({
      id: `termino:${t.id}`,
      tipo: 'termino',
      titulo: t.termino,
      texto: t.definicion,
      claves: `${t.sinonimos.join(' ')} ${t.equivalente_ingles}`,
      ruta: `/glosario?t=${t.id}`,
      extracto: excerpt(t.definicion),
      area: t.areas[0] ?? 'contabilidad',
    });
  }

  for (const app of content.apps) {
    docs.push({
      id: `app:${app.id}`,
      tipo: 'app',
      titulo: app.nombre,
      texto: app.para_que,
      claves: app.plataformas.join(' '),
      ruta: `/apps?a=${app.id}`,
      extracto: excerpt(app.para_que),
      area: app.areas[0] ?? 'tecnologia',
    });
  }

  for (const e of content.ejercicios) {
    docs.push({
      id: `ejercicio:${e.id}`,
      tipo: 'ejercicio',
      titulo: excerpt(e.enunciado, 80),
      texto: e.enunciado,
      claves: 'ejercicio practica',
      ruta: `/practica/${e.id}`,
      extracto: excerpt(e.enunciado),
      area: materiaById.get(e.materia)?.areas[0] ?? 'contabilidad',
    });
  }

  return docs;
}

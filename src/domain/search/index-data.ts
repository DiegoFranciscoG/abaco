/**
 * Shared by the build script (Node, type stripping) and the app: it must stay free of runtime imports so
 * `node scripts/build-search-index.ts` can load it directly. Only type imports are allowed here.
 */
import type { App, Asignatura, Carrera, Ejercicio, Formula, Temario, Termino, Universidad } from '../content/schemas';

export type SearchDocType = 'formula' | 'subtema' | 'asignatura' | 'carrera' | 'termino' | 'app' | 'ejercicio';

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
  'a', 'al', 'con', 'de', 'del', 'el', 'en', 'es', 'la', 'las', 'lo', 'los', 'o', 'para', 'por', 'que', 'se', 'su', 'un', 'una', 'y',
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

const excerpt = (text: string, max = 140): string => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);
const functionNames = (formula: string): string[] => formula.match(/[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9.]*(?=\()/g) ?? [];

export interface SearchContent {
  universidades: Universidad[];
  carreras: Carrera[];
  mallas: { carrera: string; asignaturas: Asignatura[] }[];
  temarios: Temario[];
  formulas: Formula[];
  glosario: Termino[];
  apps: App[];
  ejercicios: Ejercicio[];
}

export function buildSearchDocuments(content: SearchContent): SearchDoc[] {
  const docs: SearchDoc[] = [];
  const uni = new Map(content.universidades.map((u) => [u.id, u]));
  const carreraById = new Map(content.carreras.map((c) => [c.id, c]));
  const subjectById = new Map<string, Asignatura>();

  for (const carrera of content.carreras) {
    docs.push({
      id: `carrera:${carrera.id}`,
      tipo: 'carrera',
      titulo: carrera.nombre,
      texto: `${uni.get(carrera.universidad)?.nombre ?? ''} ${carrera.titulo_otorgado} ${carrera.modalidad.join(' ')}`,
      claves: `${uni.get(carrera.universidad)?.siglas ?? ''} carrera malla`,
      ruta: `/carrera/${carrera.id}`,
      extracto: `${uni.get(carrera.universidad)?.siglas ?? ''} · ${carrera.num_ciclos} ciclos · ${carrera.titulo_otorgado}`,
      area: 'gestion',
    });
  }

  for (const malla of content.mallas) {
    const carrera = carreraById.get(malla.carrera);
    for (const a of malla.asignaturas) {
      subjectById.set(a.id, a);
      docs.push({
        id: `asignatura:${a.id}`,
        tipo: 'asignatura',
        titulo: a.nombre,
        texto: `${carrera?.nombre ?? ''} ciclo ${a.ciclo}`,
        claves: `${a.nombre_oficial} ${uni.get(carrera?.universidad ?? '')?.siglas ?? ''}`,
        ruta: `/asignatura/${a.id}`,
        extracto: `${uni.get(carrera?.universidad ?? '')?.siglas ?? ''} · ${carrera?.nombre ?? ''} · ciclo ${a.ciclo}`,
        area: a.areas[0] ?? 'gestion',
      });
    }
  }

  for (const temario of content.temarios) {
    const subject = subjectById.get(temario.asignatura);
    for (const tema of temario.temas) {
      for (const s of tema.subtemas) {
        docs.push({
          id: `subtema:${s.id}`,
          tipo: 'subtema',
          titulo: s.nombre,
          texto: `${s.explicacion} ${s.puntos_clave.join(' ')}`,
          claves: `${tema.nombre} ${subject?.nombre ?? ''}`,
          ruta: `/asignatura/${temario.asignatura}/tema/${tema.id}?s=${s.id}`,
          extracto: excerpt(s.explicacion),
          area: subject?.areas[0] ?? 'gestion',
        });
      }
    }
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
      area: subjectById.get(e.asignatura)?.areas[0] ?? 'contabilidad',
    });
  }

  return docs;
}

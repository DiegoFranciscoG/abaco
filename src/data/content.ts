import carrerasJson from '../../content/carreras.json';
import fuentesJson from '../../content/fuentes.json';
import universidadesJson from '../../content/universidades.json';
import type {
  App,
  Asignatura,
  Carrera,
  Ejercicio,
  Formula,
  Fuente,
  FuenteRef,
  Malla,
  Plantilla,
  Temario,
  Termino,
  Universidad,
} from '../domain/content/schemas';
import { matchesSubject } from '../domain/text/normalize';

/** Small, always-needed catalogs are bundled; everything else is loaded on demand (one chunk per career/subject). */
export const universidades = universidadesJson as Universidad[];
export const carreras = carrerasJson as Carrera[];
export const fuentes = fuentesJson as Fuente[];

const mallaLoaders = import.meta.glob<Malla>('../../content/mallas/*.json', { import: 'default' });
const temarioLoaders = import.meta.glob<Temario>('../../content/temarios/*.json', { import: 'default' });

const fileId = (path: string): string => path.split('/').pop()?.replace(/\.json$/, '') ?? path;
const mallaPaths = new Map(Object.keys(mallaLoaders).map((path) => [fileId(path), path]));
const temarioPaths = new Map(Object.keys(temarioLoaders).map((path) => [fileId(path), path]));

/** Subjects that have deep content (topics, subtopics) in this release. */
export const SUBJECTS_WITH_CONTENT: ReadonlySet<string> = new Set(temarioPaths.keys());

export function getCarrera(id: string): Carrera | undefined {
  return carreras.find((c) => c.id === id);
}

export function getUniversidad(id: string): Universidad | undefined {
  return universidades.find((u) => u.id === id);
}

export function resolveFuente(ref: FuenteRef): (Fuente & { seccion?: string }) | undefined {
  const base = fuentes.find((f) => f.id === ref.ref);
  if (!base) return undefined;
  return { ...base, url: ref.url ?? base.url, ...(ref.seccion ? { seccion: ref.seccion } : {}) };
}

export async function loadMalla(carreraId: string): Promise<Malla | undefined> {
  const path = mallaPaths.get(carreraId);
  const loader = path ? mallaLoaders[path] : undefined;
  return loader ? loader() : undefined;
}

export async function loadTemario(asignaturaId: string): Promise<Temario | undefined> {
  const path = temarioPaths.get(asignaturaId);
  const loader = path ? temarioLoaders[path] : undefined;
  return loader ? loader() : undefined;
}

/** Career id is the part of the subject id before "--". */
export function carreraOfAsignatura(asignaturaId: string): string {
  return asignaturaId.split('--')[0] ?? asignaturaId;
}

export async function findAsignatura(asignaturaId: string): Promise<{ asignatura: Asignatura; carrera: Carrera } | undefined> {
  const carrera = getCarrera(carreraOfAsignatura(asignaturaId));
  if (!carrera) return undefined;
  const malla = await loadMalla(carrera.id);
  const asignatura = malla?.asignaturas.find((a) => a.id === asignaturaId);
  return asignatura ? { asignatura, carrera } : undefined;
}

let formulasCache: Promise<Formula[]> | null = null;
export function loadFormulas(): Promise<Formula[]> {
  formulasCache ??= import('../../content/formulas.json').then(
    (m) => (m.default as Formula[]).filter((f) => f.estado !== 'pendiente'),
  );
  return formulasCache;
}

export async function loadEjercicios(): Promise<Ejercicio[]> {
  return (await import('../../content/ejercicios.json')).default as Ejercicio[];
}

export async function loadApps(): Promise<App[]> {
  return (await import('../../content/apps.json')).default as App[];
}

export async function loadGlosario(): Promise<Termino[]> {
  return (await import('../../content/glosario.json')).default as Termino[];
}

export async function loadPlantillas(): Promise<Plantilla[]> {
  return (await import('../../content/plantillas.json')).default as Plantilla[];
}

/** Items whose `aparece_en` keys match a subject name ("Matemáticas Financieras" ↔ "matematica financiera"). */
export function relatedTo<T extends { aparece_en: string[] }>(items: T[], subjectName: string): T[] {
  return items.filter((item) => item.aparece_en.some((key) => matchesSubject(subjectName, key)));
}

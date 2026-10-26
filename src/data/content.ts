import carrerasJson from '../../content/carreras.json';
import fuentesJson from '../../content/fuentes.json';
import materiasJson from '../../content/materias.json';
import type {
  App,
  Area,
  Carrera,
  Ejercicio,
  Formula,
  Fuente,
  FuenteRef,
  Materia,
  Plantilla,
  Temario,
  Termino,
} from '../domain/content/schemas';

/** Small, always-needed catalogs are bundled; syllabi and the rest of the content load on demand. */
export const materias = (materiasJson as unknown as Materia[]).slice().sort((a, b) => a.orden - b.orden);
export const fuentes = fuentesJson as unknown as Fuente[];

const temarioLoaders = import.meta.glob<Temario>('../../content/temarios/*.json', { import: 'default' });
const fileId = (path: string): string => path.split('/').pop()?.replace(/\.json$/, '') ?? path;
const temarioPaths = new Map(Object.keys(temarioLoaders).map((path) => [fileId(path), path]));

export function getMateria(id: string): Materia | undefined {
  return materias.find((m) => m.id === id);
}

export function materiasByArea(area: Area): Materia[] {
  return materias.filter((m) => m.areas[0] === area);
}

export const carreras = carrerasJson as unknown as Carrera[];

export function getCarrera(id: string): Carrera | undefined {
  return carreras.find((c) => c.id === id);
}

/** Subjects of a career in its usual cycle `ciclo` (all cycles when omitted), in catalog order. */
export function materiasDeCiclo(carrera: Carrera, ciclo?: number): { materia: Materia; entrada: Carrera['materias'][number] }[] {
  return carrera.materias
    .filter((e) => ciclo === undefined || e.ciclo === ciclo)
    .map((entrada) => ({ materia: getMateria(entrada.materia), entrada }))
    .filter((r): r is { materia: Materia; entrada: Carrera['materias'][number] } => r.materia !== undefined)
    .sort((a, b) => a.entrada.ciclo - b.entrada.ciclo || a.materia.orden - b.materia.orden);
}

/** Careers that include a subject, with its usual cycle in each. */
export function carrerasDeMateria(materiaId: string): { carrera: Carrera; ciclo: number; planes: number }[] {
  return carreras.flatMap((carrera) => {
    const entrada = carrera.materias.find((e) => e.materia === materiaId);
    return entrada ? [{ carrera, ciclo: entrada.ciclo, planes: entrada.planes }] : [];
  });
}

export function resolveFuente(ref: FuenteRef): (Fuente & { seccion?: string }) | undefined {
  const base = fuentes.find((f) => f.id === ref.ref);
  if (!base) return undefined;
  return { ...base, url: ref.url ?? base.url, ...(ref.seccion ? { seccion: ref.seccion } : {}) };
}

export async function loadTemario(materiaId: string): Promise<Temario | undefined> {
  const path = temarioPaths.get(materiaId);
  const loader = path ? temarioLoaders[path] : undefined;
  return loader ? loader() : undefined;
}

let formulasCache: Promise<Formula[]> | null = null;
export function loadFormulas(): Promise<Formula[]> {
  formulasCache ??= import('../../content/formulas.json').then(
    (m) => (m.default as unknown as Formula[]).filter((f) => f.estado !== 'pendiente'),
  );
  return formulasCache;
}

export async function loadEjercicios(): Promise<Ejercicio[]> {
  return (await import('../../content/ejercicios.json')).default as unknown as Ejercicio[];
}

export async function loadApps(): Promise<App[]> {
  return (await import('../../content/apps.json')).default as unknown as App[];
}

export async function loadGlosario(): Promise<Termino[]> {
  return (await import('../../content/glosario.json')).default as unknown as Termino[];
}

export async function loadPlantillas(): Promise<Plantilla[]> {
  return (await import('../../content/plantillas.json')).default as unknown as Plantilla[];
}

/** Formulas, apps or templates that declare the subject in `materias`. */
export function relatedTo<T extends { materias: string[] }>(items: T[], materiaId: string): T[] {
  return items.filter((item) => item.materias.includes(materiaId));
}

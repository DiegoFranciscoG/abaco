import materiasJson from '../../content/materias.json';
import { subjectKey } from '../domain/text/normalize';

/**
 * Earlier releases organized content by university curricula; subjects had ids like
 * "<carrera>--c1-contabilidad-general". This module maps those ids to the current subject catalog so that notes,
 * stars, collections and reminders saved on a device (or in an old backup) are not lost.
 */
interface MateriaLike {
  id: string;
  nombre: string;
  sinonimos: string[];
}

const MATERIAS = materiasJson as MateriaLike[];

const ROMAN_OR_NUMBER = /\b(i|ii|iii|iv|v|vi|[0-9]+)\b/g;

const keyOf = (value: string): string => subjectKey(value).replace(ROMAN_OR_NUMBER, ' ').replace(/\s+/g, ' ').trim();

const NAME_INDEX: Map<string, string> = new Map(
  MATERIAS.flatMap((m) => [m.nombre, ...m.sinonimos, m.id.replace(/-/g, ' ')].map((name) => [keyOf(name), m.id] as const)),
);

/** Current subject id for an id saved by an earlier release, or undefined when it has no equivalent. */
export function legacyMateria(oldId: string): string | undefined {
  if (MATERIAS.some((m) => m.id === oldId)) return oldId;
  const slug = oldId.includes('--') ? oldId.split('--').pop() ?? '' : oldId;
  const name = slug.replace(/^c[0-9]+-/, '').replace(/-/g, ' ');
  return NAME_INDEX.get(keyOf(name));
}

/** Route of a subject page in the current release. */
export const materiaRoute = (id: string): string => `/materia/${id}`;

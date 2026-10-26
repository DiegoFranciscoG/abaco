import { getCarrera } from '../../data/content';
import type { Perfil } from '../../data/types';
import type { Carrera } from '../../domain/content/schemas';

export const ordinal = (n: number) => `${n}.º`;

/** "ciclos 3 y 4" / "ciclos 2, 3 y 4" for the cycles other than the usual one. */
export function otherCycles(ciclos: number[], usual: number): string {
  const rest = ciclos.filter((c) => c !== usual);
  if (rest.length === 0) return '';
  const list =
    rest.length === 1 ? String(rest[0]) : `${rest.slice(0, -1).join(', ')} y ${rest[rest.length - 1]}`;
  return rest.length === 1 ? `también en el ciclo ${list}` : `también en los ciclos ${list}`;
}

/** Selected career and cycle: the URL wins (shareable links), then the saved profile. */
export function readSelection(
  params: URLSearchParams,
  profile: Perfil,
): { carrera: Carrera | undefined; ciclo: number | null } {
  const fromUrl = params.get('carrera');
  const carrera = getCarrera(fromUrl ?? profile.carrera ?? '');
  if (!carrera) return { carrera: undefined, ciclo: null };
  const raw =
    fromUrl !== null
      ? params.get('ciclo')
      : profile.carrera === carrera.id
        ? String(profile.ciclo ?? '')
        : null;
  const ciclo = raw ? Number(raw) : NaN;
  return { carrera, ciclo: Number.isInteger(ciclo) && ciclo >= 1 && ciclo <= carrera.ciclos ? ciclo : null };
}

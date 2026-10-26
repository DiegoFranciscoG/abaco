import normativaJson from '../../../content/normativa.json';
import type { Cifra } from './schemas';

/**
 * Normative figures of Ecuador with their validity (content/normativa.json, validated by tests/content). The
 * calculators read their rates and tables from here, so a yearly update is a change in one JSON file.
 */
export const NORMATIVA = normativaJson as unknown as Cifra[];

export function getCifra(id: string): Cifra | undefined {
  return NORMATIVA.find((c) => c.id === id);
}

/** A figure the calculators cannot work without; a missing id is a programming error caught by the tests. */
export function requireCifra(id: string): Cifra {
  const cifra = getCifra(id);
  if (!cifra) throw new Error(`Falta la cifra normativa «${id}» en content/normativa.json`);
  return cifra;
}

export function cifraValor(id: string): number {
  const { valor } = requireCifra(id);
  if (valor === undefined) throw new Error(`La cifra «${id}» no es un valor único`);
  return valor;
}

/** "9.45" → "9,45 %" (Ecuadorian decimal comma, as the official tables print it). */
export function percentLabel(value: number): string {
  return `${String(value).replace('.', ',')} %`;
}

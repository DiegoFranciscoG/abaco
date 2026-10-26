import { useState } from 'react';
import { getCifra } from '../domain/content/normativa';
import type { Cifra } from '../domain/content/schemas';
import { isoDay, vigenciaStatus } from '../domain/content/vigencia';

/** Today's local date (YYYY-MM-DD), read once when the view opens. */
export function useToday(): string {
  const [today] = useState(() => isoDay(new Date()));
  return today;
}

/** Figures among `cifras` whose validity is over today (empty while everything is in force). */
export function useCifrasVencidas(cifras: readonly string[] | undefined): Cifra[] {
  const today = useToday();
  return (cifras ?? [])
    .map(getCifra)
    .filter((c): c is Cifra => c !== undefined && vigenciaStatus(c.vigencia, today).estado === 'vencida');
}

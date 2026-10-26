import indicadoresJson from '../../../content/indicadores.json';
import type { Indicador } from './schemas';

/** Monthly statistics shown in "Ecuador en cifras" (content/indicadores.json, validated by tests/content). */
export const INDICADORES = indicadoresJson as unknown as Indicador[];

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** "2026-09" → "septiembre de 2026". */
export function periodLabel(periodo: string): string {
  const [year, month] = periodo.split('-');
  return `${MONTHS[Number(month) - 1] ?? month} de ${year}`;
}

/** True once the source has probably published a newer value than the one shown. */
export function mayBeOutdated(indicador: Pick<Indicador, 'actualizar_desde'>, today: string): boolean {
  return today >= indicador.actualizar_desde;
}

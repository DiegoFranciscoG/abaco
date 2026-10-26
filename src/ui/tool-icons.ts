import type { ToolId } from '../domain/content/schemas';
import type { IconName } from './icons';

export const TOOL_ICON: Record<ToolId, IconName> = {
  editor: 'pen',
  diario: 'ledger',
  estadistica: 'chart',
  graficador: 'graph',
  mercado: 'market',
  macro: 'globe',
  divisas: 'coins',
  equilibrio: 'breakeven',
  proyectos: 'flow',
  'rol-pagos': 'payroll',
  impuestos: 'receipt',
  foda: 'grid4',
  tarjetas: 'cards',
  citas: 'quote',
  laboratorio: 'lab',
  buscador: 'book',
};

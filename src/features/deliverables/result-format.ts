import type { DeliverableResult, ValueFormat } from '../../domain/deliverables/types';
import { money, num } from '../tools/format';

/** Formats a value the way the student hands it in (es-EC). */
export function formatValue(value: number | string | null, format: ValueFormat): string {
  if (value === null || value === '') return '';
  if (typeof value === 'string') return value;
  switch (format) {
    case 'money':
      return money(value);
    case 'percent':
      return `${num(value * 100, 4)} %`;
    case 'integer':
      return num(value, 0);
    case 'number':
      return num(value, 4);
    default:
      return String(value);
  }
}

/** Plain-text version of the procedure, to paste into a report. */
export function procedureText(titulo: string, result: DeliverableResult): string {
  const lines = [titulo, ''];
  result.pasos.forEach((p, i) => lines.push(`${i + 1}. ${p.titulo}: ${p.expresion}`));
  if (result.interpretacion.length > 0) lines.push('', ...result.interpretacion);
  return lines.join('\n');
}

import type { CellFormat } from '../content/schemas';
import { ERROR_LABELS_ES, FormulaError, type Locale, type Scalar } from '../formula';

const numberFormat = (locale: Locale, options: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat(locale === 'es' ? 'es-EC' : 'en-US', options);

const FORMATTERS = {
  es: {
    moneda: numberFormat('es', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    porcentaje: numberFormat('es', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    numero: numberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    entero: numberFormat('es', { maximumFractionDigits: 0 }),
    general: numberFormat('es', { maximumSignificantDigits: 12, useGrouping: false }),
  },
  en: {
    moneda: numberFormat('en', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    porcentaje: numberFormat('en', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    numero: numberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    entero: numberFormat('en', { maximumFractionDigits: 0 }),
    general: numberFormat('en', { maximumSignificantDigits: 12, useGrouping: false }),
  },
} satisfies Record<Locale, Record<CellFormat, Intl.NumberFormat>>;

export function formatValue(value: Scalar, format: CellFormat = 'general', locale: Locale = 'es'): string {
  if (value === null) return '';
  if (value instanceof FormulaError) return locale === 'es' ? ERROR_LABELS_ES[value.code] : value.code;
  if (typeof value === 'boolean') {
    if (locale === 'es') return value ? 'VERDADERO' : 'FALSO';
    return value ? 'TRUE' : 'FALSE';
  }
  if (typeof value === 'string') return value;
  return FORMATTERS[locale][format].format(value);
}

/** Converts a stored literal to how it should be written in the other locale ("1.5" ↔ "1,5"). */
export function localizeLiteral(raw: string, from: Locale, to: Locale): string {
  if (from === to || raw.trim().startsWith('=')) return raw;
  const fromDecimal = from === 'es' ? ',' : '.';
  const toDecimal = to === 'es' ? ',' : '.';
  return /^-?\$?\d+([.,]\d+)?%?$/.test(raw.trim()) ? raw.replace(fromDecimal, toDecimal) : raw;
}

export const XLSX_NUMBER_FORMATS: Record<CellFormat, string | undefined> = {
  general: undefined,
  numero: '#,##0.00',
  moneda: '"$"#,##0.00',
  porcentaje: '0.00%',
  entero: '0',
};

export function formatFromXlsx(code: string | undefined): CellFormat {
  if (!code || code === 'General') return 'general';
  if (code.includes('%')) return 'porcentaje';
  if (code.includes('$')) return 'moneda';
  if (/^0$|^#,##0$/.test(code)) return 'entero';
  if (code.includes('0.00')) return 'numero';
  return 'general';
}

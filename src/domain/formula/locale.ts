import { tokenize, SYNTAX, type Locale } from './tokenizer';

/**
 * Spanish Excel function names, verified against Microsoft's official function references
 * (financial, statistical and logical) on 2026-10-14. Names whose Spanish form could not be verified
 * (for example POWER and INT) are only accepted in English. See docs/investigacion.md (X1–X4).
 */
export const SPANISH_TO_ENGLISH: Readonly<Record<string, string>> = {
  // Financial
  VA: 'PV',
  VF: 'FV',
  PAGO: 'PMT',
  TASA: 'RATE',
  NPER: 'NPER',
  VNA: 'NPV',
  TIR: 'IRR',
  TIRM: 'MIRR',
  PAGOINT: 'IPMT',
  PAGOPRIN: 'PPMT',
  'PAGO.INT.ENTRE': 'CUMIPMT',
  'PAGO.PRINC.ENTRE': 'CUMPRINC',
  SLN: 'SLN',
  SYD: 'SYD',
  DB: 'DB',
  DDB: 'DDB',
  'INT.EFECTIVO': 'EFFECT',
  'TASA.NOMINAL': 'NOMINAL',
  'INT.PAGO.DIR': 'ISPMT',
  'P.DURACION': 'PDURATION',
  RRI: 'RRI',
  // Statistical
  PROMEDIO: 'AVERAGE',
  'PROMEDIO.SI': 'AVERAGEIF',
  MEDIANA: 'MEDIAN',
  'MODA.UNO': 'MODE.SNGL',
  'DESVEST.M': 'STDEV.S',
  'DESVEST.P': 'STDEV.P',
  'VAR.S': 'VAR.S',
  'VAR.P': 'VAR.P',
  'COEF.DE.CORREL': 'CORREL',
  CONTAR: 'COUNT',
  CONTARA: 'COUNTA',
  'K.ESIMO.MAYOR': 'LARGE',
  'K.ESIMO.MENOR': 'SMALL',
  'PERCENTIL.INC': 'PERCENTILE.INC',
  'CUARTIL.INC': 'QUARTILE.INC',
  'MEDIA.GEOM': 'GEOMEAN',
  NORMALIZACION: 'STANDARDIZE',
  PENDIENTE: 'SLOPE',
  'INTERSECCION.EJE': 'INTERCEPT',
  'COEFICIENTE.R2': 'RSQ',
  'COVARIANZA.M': 'COVARIANCE.S',
  'COVARIANZA.P': 'COVARIANCE.P',
  'DISTR.NORM.N': 'NORM.DIST',
  'DISTR.NORM.ESTAND.N': 'NORM.S.DIST',
  'INV.NORM': 'NORM.INV',
  'INV.NORM.ESTAND': 'NORM.S.INV',
  DESVPROM: 'AVEDEV',
  DESVIA2: 'DEVSQ',
  'COEFICIENTE.ASIMETRIA': 'SKEW',
  CURTOSIS: 'KURT',
  'JERARQUIA.EQV': 'RANK.EQ',
  MAX: 'MAX',
  MIN: 'MIN',
  // Logical
  SI: 'IF',
  'SI.ERROR': 'IFERROR',
  'SI.CONJUNTO': 'IFS',
  Y: 'AND',
  O: 'OR',
  NO: 'NOT',
  VERDADERO: 'TRUE',
  FALSO: 'FALSE',
  // Math and trigonometry
  SUMA: 'SUM',
  SUMAPRODUCTO: 'SUMPRODUCT',
  PRODUCTO: 'PRODUCT',
  REDONDEAR: 'ROUND',
  'REDONDEAR.MAS': 'ROUNDUP',
  'REDONDEAR.MENOS': 'ROUNDDOWN',
  ABS: 'ABS',
  RAIZ: 'SQRT',
  LN: 'LN',
  LOG: 'LOG',
  LOG10: 'LOG10',
  EXP: 'EXP',
  RESIDUO: 'MOD',
  PI: 'PI',
  TRUNCAR: 'TRUNC',
  SIGNO: 'SIGN',
  'SUMAR.SI': 'SUMIF',
  'SUMA.CUADRADOS': 'SUMSQ',
};

export const ENGLISH_TO_SPANISH: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(SPANISH_TO_ENGLISH).map(([es, en]) => [en, es]),
);

/** Canonical (English) name for a function written in either language. */
export function canonicalFunctionName(name: string): string {
  const upper = name.toUpperCase();
  return SPANISH_TO_ENGLISH[upper] ?? upper;
}

/**
 * Rewrites a formula from one Excel locale to another: function names, argument separators and decimal
 * separators. Text inside quotes is preserved.
 */
export function translateFormula(formula: string, from: Locale, to: Locale): string {
  if (from === to) return formula;
  const tokens = tokenize(formula, from);
  const target = SYNTAX[to];
  const parts: string[] = [];
  tokens.forEach((token, index) => {
    const nextToken = tokens[index + 1];
    switch (token.type) {
      case 'number':
        parts.push(target.decimalSeparator === ',' ? token.value.replace('.', ',') : token.value);
        break;
      case 'sep':
        parts.push(to === 'es' ? '; ' : ', ');
        break;
      case 'ident': {
        if (nextToken?.type === 'lparen') {
          const canonical = canonicalFunctionName(token.value);
          parts.push(to === 'es' ? (ENGLISH_TO_SPANISH[canonical] ?? canonical) : canonical);
        } else {
          parts.push(token.text);
        }
        break;
      }
      case 'bool':
        parts.push(to === 'es' ? (token.value === 'TRUE' ? 'VERDADERO' : 'FALSO') : token.value);
        break;
      case 'string':
        parts.push(`"${token.value.replace(/"/g, '""')}"`);
        break;
      case 'eof':
        break;
      default:
        parts.push(token.text);
    }
  });
  const body = parts.join('').replace(/\s+\)/g, ')');
  return formula.trimStart().startsWith('=') ? `=${body}` : body;
}

/** Normalizes spacing so two formulas can be compared regardless of spaces after separators. */
export function compactFormula(formula: string): string {
  return formula.replace(/\s+/g, '').toUpperCase();
}

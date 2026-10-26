import * as formulajs from '@formulajs/formulajs';
import { ENGLISH_TO_SPANISH } from './locale';
import { flatten, fromNative, FormulaError, type Value } from './values';

export type FunctionCategory = 'financiera' | 'estadistica' | 'matematica' | 'logica';

export interface FunctionInfo {
  name: string;
  spanish?: string;
  category: FunctionCategory;
  /** Short signature shown by the formula assistant. */
  signature: string;
  description: string;
}

type Implementation = (...args: unknown[]) => unknown;

/** Functions evaluated by the engine itself (lazy arguments or simple semantics). */
export const SPECIAL_FORMS = new Set(['IF', 'IFERROR', 'IFS', 'AND', 'OR', 'NOT', 'TRUE', 'FALSE', 'PI']);

const CATALOG: readonly Omit<FunctionInfo, 'spanish'>[] = [
  {
    name: 'PV',
    category: 'financiera',
    signature: '(tasa, nper, pago, [vf], [tipo])',
    description: 'Valor actual de una inversión o préstamo.',
  },
  {
    name: 'FV',
    category: 'financiera',
    signature: '(tasa, nper, pago, [va], [tipo])',
    description: 'Valor futuro con pagos periódicos y tasa constante.',
  },
  {
    name: 'PMT',
    category: 'financiera',
    signature: '(tasa, nper, va, [vf], [tipo])',
    description: 'Cuota periódica de un préstamo o anualidad.',
  },
  {
    name: 'RATE',
    category: 'financiera',
    signature: '(nper, pago, va, [vf], [tipo])',
    description: 'Tasa de interés por período.',
  },
  {
    name: 'NPER',
    category: 'financiera',
    signature: '(tasa, pago, va, [vf], [tipo])',
    description: 'Número de períodos.',
  },
  {
    name: 'NPV',
    category: 'financiera',
    signature: '(tasa, valor1, …)',
    description: 'Valor neto actual de flujos que empiezan al final del período 1.',
  },
  {
    name: 'IRR',
    category: 'financiera',
    signature: '(valores, [estimación])',
    description: 'Tasa interna de retorno.',
  },
  {
    name: 'MIRR',
    category: 'financiera',
    signature: '(valores, tasa_fin, tasa_reinv)',
    description: 'TIR modificada.',
  },
  {
    name: 'IPMT',
    category: 'financiera',
    signature: '(tasa, per, nper, va, [vf], [tipo])',
    description: 'Interés pagado en un período.',
  },
  {
    name: 'PPMT',
    category: 'financiera',
    signature: '(tasa, per, nper, va, [vf], [tipo])',
    description: 'Capital amortizado en un período.',
  },
  {
    name: 'CUMIPMT',
    category: 'financiera',
    signature: '(tasa, nper, va, inicio, fin, tipo)',
    description: 'Interés acumulado entre dos períodos.',
  },
  {
    name: 'CUMPRINC',
    category: 'financiera',
    signature: '(tasa, nper, va, inicio, fin, tipo)',
    description: 'Capital acumulado entre dos períodos.',
  },
  {
    name: 'SLN',
    category: 'financiera',
    signature: '(costo, valor_residual, vida)',
    description: 'Depreciación en línea recta.',
  },
  {
    name: 'SYD',
    category: 'financiera',
    signature: '(costo, valor_residual, vida, período)',
    description: 'Depreciación por suma de dígitos.',
  },
  {
    name: 'DB',
    category: 'financiera',
    signature: '(costo, valor_residual, vida, período, [mes])',
    description: 'Depreciación por saldo fijo decreciente.',
  },
  {
    name: 'DDB',
    category: 'financiera',
    signature: '(costo, valor_residual, vida, período, [factor])',
    description: 'Depreciación por doble saldo decreciente.',
  },
  {
    name: 'EFFECT',
    category: 'financiera',
    signature: '(tasa_nominal, núm_per_año)',
    description: 'Tasa efectiva anual.',
  },
  {
    name: 'NOMINAL',
    category: 'financiera',
    signature: '(tasa_efectiva, núm_per_año)',
    description: 'Tasa nominal anual.',
  },
  {
    name: 'ISPMT',
    category: 'financiera',
    signature: '(tasa, período, nper, va)',
    description: 'Interés de un período con amortización de capital constante.',
  },
  {
    name: 'PDURATION',
    category: 'financiera',
    signature: '(tasa, va, vf)',
    description: 'Períodos para que una inversión alcance un valor.',
  },
  {
    name: 'RRI',
    category: 'financiera',
    signature: '(nper, va, vf)',
    description: 'Tasa equivalente de crecimiento.',
  },
  { name: 'AVERAGE', category: 'estadistica', signature: '(número1, …)', description: 'Media aritmética.' },
  {
    name: 'AVERAGEIF',
    category: 'estadistica',
    signature: '(rango, criterio, [rango_promedio])',
    description: 'Promedio de las celdas que cumplen un criterio.',
  },
  { name: 'MEDIAN', category: 'estadistica', signature: '(número1, …)', description: 'Mediana.' },
  { name: 'MODE.SNGL', category: 'estadistica', signature: '(número1, …)', description: 'Moda.' },
  {
    name: 'STDEV.S',
    category: 'estadistica',
    signature: '(número1, …)',
    description: 'Desviación estándar de una muestra.',
  },
  {
    name: 'STDEV.P',
    category: 'estadistica',
    signature: '(número1, …)',
    description: 'Desviación estándar de la población.',
  },
  {
    name: 'VAR.S',
    category: 'estadistica',
    signature: '(número1, …)',
    description: 'Varianza de una muestra.',
  },
  {
    name: 'VAR.P',
    category: 'estadistica',
    signature: '(número1, …)',
    description: 'Varianza de la población.',
  },
  {
    name: 'CORREL',
    category: 'estadistica',
    signature: '(matriz1, matriz2)',
    description: 'Coeficiente de correlación de Pearson.',
  },
  {
    name: 'COUNT',
    category: 'estadistica',
    signature: '(valor1, …)',
    description: 'Cuenta celdas con números.',
  },
  {
    name: 'COUNTA',
    category: 'estadistica',
    signature: '(valor1, …)',
    description: 'Cuenta celdas no vacías.',
  },
  {
    name: 'COUNTIF',
    category: 'estadistica',
    signature: '(rango, criterio)',
    description: 'Cuenta celdas que cumplen un criterio.',
  },
  { name: 'LARGE', category: 'estadistica', signature: '(matriz, k)', description: 'k-ésimo mayor.' },
  { name: 'SMALL', category: 'estadistica', signature: '(matriz, k)', description: 'k-ésimo menor.' },
  {
    name: 'PERCENTILE.INC',
    category: 'estadistica',
    signature: '(matriz, k)',
    description: 'Percentil k (incluye extremos).',
  },
  {
    name: 'QUARTILE.INC',
    category: 'estadistica',
    signature: '(matriz, cuartil)',
    description: 'Cuartil (incluye extremos).',
  },
  { name: 'GEOMEAN', category: 'estadistica', signature: '(número1, …)', description: 'Media geométrica.' },
  {
    name: 'STANDARDIZE',
    category: 'estadistica',
    signature: '(x, media, desv_estándar)',
    description: 'Puntuación z.',
  },
  {
    name: 'SLOPE',
    category: 'estadistica',
    signature: '(conocido_y, conocido_x)',
    description: 'Pendiente de la recta de regresión.',
  },
  {
    name: 'INTERCEPT',
    category: 'estadistica',
    signature: '(conocido_y, conocido_x)',
    description: 'Intersección de la recta de regresión.',
  },
  {
    name: 'RSQ',
    category: 'estadistica',
    signature: '(conocido_y, conocido_x)',
    description: 'Coeficiente de determinación R².',
  },
  {
    name: 'COVARIANCE.S',
    category: 'estadistica',
    signature: '(matriz1, matriz2)',
    description: 'Covarianza muestral.',
  },
  {
    name: 'COVARIANCE.P',
    category: 'estadistica',
    signature: '(matriz1, matriz2)',
    description: 'Covarianza poblacional.',
  },
  {
    name: 'NORM.DIST',
    category: 'estadistica',
    signature: '(x, media, desv, acumulado)',
    description: 'Distribución normal.',
  },
  {
    name: 'NORM.S.DIST',
    category: 'estadistica',
    signature: '(z, acumulado)',
    description: 'Distribución normal estándar.',
  },
  {
    name: 'NORM.INV',
    category: 'estadistica',
    signature: '(probabilidad, media, desv)',
    description: 'Inversa de la normal.',
  },
  {
    name: 'NORM.S.INV',
    category: 'estadistica',
    signature: '(probabilidad)',
    description: 'Inversa de la normal estándar.',
  },
  {
    name: 'AVEDEV',
    category: 'estadistica',
    signature: '(número1, …)',
    description: 'Desviación absoluta promedio.',
  },
  {
    name: 'DEVSQ',
    category: 'estadistica',
    signature: '(número1, …)',
    description: 'Suma de cuadrados de las desviaciones.',
  },
  {
    name: 'SKEW',
    category: 'estadistica',
    signature: '(número1, …)',
    description: 'Coeficiente de asimetría.',
  },
  { name: 'KURT', category: 'estadistica', signature: '(número1, …)', description: 'Curtosis.' },
  {
    name: 'RANK.EQ',
    category: 'estadistica',
    signature: '(número, referencia, [orden])',
    description: 'Posición de un número en una lista.',
  },
  { name: 'MAX', category: 'estadistica', signature: '(número1, …)', description: 'Valor máximo.' },
  { name: 'MIN', category: 'estadistica', signature: '(número1, …)', description: 'Valor mínimo.' },
  { name: 'SUM', category: 'matematica', signature: '(número1, …)', description: 'Suma.' },
  {
    name: 'SUMPRODUCT',
    category: 'matematica',
    signature: '(matriz1, matriz2, …)',
    description: 'Suma de productos.',
  },
  { name: 'PRODUCT', category: 'matematica', signature: '(número1, …)', description: 'Producto.' },
  { name: 'ROUND', category: 'matematica', signature: '(número, decimales)', description: 'Redondea.' },
  {
    name: 'ROUNDUP',
    category: 'matematica',
    signature: '(número, decimales)',
    description: 'Redondea hacia arriba.',
  },
  {
    name: 'ROUNDDOWN',
    category: 'matematica',
    signature: '(número, decimales)',
    description: 'Redondea hacia abajo.',
  },
  { name: 'ABS', category: 'matematica', signature: '(número)', description: 'Valor absoluto.' },
  { name: 'SQRT', category: 'matematica', signature: '(número)', description: 'Raíz cuadrada.' },
  {
    name: 'POWER',
    category: 'matematica',
    signature: '(número, potencia)',
    description: 'Potencia (en español usa el operador ^).',
  },
  { name: 'INT', category: 'matematica', signature: '(número)', description: 'Parte entera hacia abajo.' },
  { name: 'LN', category: 'matematica', signature: '(número)', description: 'Logaritmo natural.' },
  { name: 'LOG', category: 'matematica', signature: '(número, [base])', description: 'Logaritmo.' },
  { name: 'LOG10', category: 'matematica', signature: '(número)', description: 'Logaritmo base 10.' },
  { name: 'EXP', category: 'matematica', signature: '(número)', description: 'e elevado a un número.' },
  {
    name: 'MOD',
    category: 'matematica',
    signature: '(número, divisor)',
    description: 'Residuo de una división.',
  },
  {
    name: 'TRUNC',
    category: 'matematica',
    signature: '(número, [decimales])',
    description: 'Trunca decimales.',
  },
  { name: 'SIGN', category: 'matematica', signature: '(número)', description: 'Signo de un número.' },
  {
    name: 'SUMIF',
    category: 'matematica',
    signature: '(rango, criterio, [rango_suma])',
    description: 'Suma las celdas que cumplen un criterio.',
  },
  { name: 'SUMSQ', category: 'matematica', signature: '(número1, …)', description: 'Suma de cuadrados.' },
  { name: 'PI', category: 'matematica', signature: '()', description: 'El número π.' },
  {
    name: 'IF',
    category: 'logica',
    signature: '(prueba, si_verdadero, [si_falso])',
    description: 'Elige un valor según una condición.',
  },
  {
    name: 'IFERROR',
    category: 'logica',
    signature: '(valor, valor_si_error)',
    description: 'Reemplaza un error por otro valor.',
  },
  {
    name: 'IFS',
    category: 'logica',
    signature: '(prueba1, valor1, …)',
    description: 'Varias condiciones en orden.',
  },
  { name: 'AND', category: 'logica', signature: '(lógico1, …)', description: 'Verdadero si todas lo son.' },
  { name: 'OR', category: 'logica', signature: '(lógico1, …)', description: 'Verdadero si alguna lo es.' },
  { name: 'NOT', category: 'logica', signature: '(lógico)', description: 'Invierte un valor lógico.' },
  { name: 'TRUE', category: 'logica', signature: '()', description: 'Valor lógico verdadero.' },
  { name: 'FALSE', category: 'logica', signature: '()', description: 'Valor lógico falso.' },
];

export const FUNCTION_CATALOG: readonly FunctionInfo[] = CATALOG.map((info) => {
  const spanish = ENGLISH_TO_SPANISH[info.name];
  return spanish ? { ...info, spanish } : { ...info };
});

const SUPPORTED = new Set(FUNCTION_CATALOG.map((f) => f.name));

export function isSupportedFunction(canonicalName: string): boolean {
  return SUPPORTED.has(canonicalName);
}

/** Resolves "STDEV.S" to formulajs.STDEV.S (namespaced) and "PV" to formulajs.PV. */
function resolveImplementation(name: string): Implementation | null {
  let target: unknown = formulajs;
  for (const part of name.split('.')) {
    if (
      target &&
      (typeof target === 'object' || typeof target === 'function') &&
      part in (target as object)
    ) {
      target = (target as Record<string, unknown>)[part];
    } else {
      return null;
    }
  }
  return typeof target === 'function' ? (target as Implementation) : null;
}

/** Excel compares text criteria without caring about capitals: =SUMIF(A:A,"caja",B:B) also adds "Caja". */
const CASE_INSENSITIVE_CRITERIA = new Set(['SUMIF', 'COUNTIF', 'AVERAGEIF']);

function lowerText(value: Value | undefined): Value | undefined {
  if (typeof value === 'string') return value.toLocaleLowerCase('es');
  if (Array.isArray(value)) {
    return value.map((row) =>
      row.map((cell) => (typeof cell === 'string' ? cell.toLocaleLowerCase('es') : cell)),
    );
  }
  return value;
}

/** Lowercases the range and the criterion (the first two arguments); the values to add stay as they are. */
function lowerCriteriaArgs(args: (Value | undefined)[]): (Value | undefined)[] {
  return args.map((arg, i) => (i < 2 ? lowerText(arg) : arg));
}

/**
 * Calls a whitelisted function with already-evaluated arguments. Missing arguments arrive as `undefined`:
 * trailing ones are dropped so formulajs applies its defaults, and omitted ones in the middle count as 0,
 * as in Excel (=PV(10%,5,,1000)).
 */
export function callFunction(canonicalName: string, args: (Value | undefined)[]): Value {
  if (!isSupportedFunction(canonicalName) || SPECIAL_FORMS.has(canonicalName)) {
    return new FormulaError('#NAME?', canonicalName);
  }
  for (const arg of args) {
    if (arg === undefined) continue;
    const firstError = flatten(arg).find((cell) => cell instanceof FormulaError);
    // Aggregates over ranges propagate the first error, like Excel.
    if (firstError instanceof FormulaError) return firstError;
  }
  const impl = resolveImplementation(canonicalName);
  if (!impl) return new FormulaError('#NAME?', canonicalName);
  const trimmed = CASE_INSENSITIVE_CRITERIA.has(canonicalName) ? lowerCriteriaArgs(args) : [...args];
  while (trimmed.length > 0 && trimmed[trimmed.length - 1] === undefined) trimmed.pop();
  try {
    return fromNative(impl(...trimmed.map((arg) => (arg === undefined ? 0 : arg))));
  } catch {
    return new FormulaError('#VALUE!', canonicalName);
  }
}

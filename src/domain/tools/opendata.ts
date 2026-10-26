/**
 * Open data clients for the "Datos macro" (World Bank) and "Tipos de cambio" (Frankfurter, ECB provider) tools.
 * Both APIs were checked on 2026-10-25 (docs/investigacion.md, section 11): no key, CORS open, data reusable with
 * attribution. Requests carry no cookies, no custom headers and no referrer; answers are validated and cached.
 */
import { z } from 'zod';

export interface DataCache {
  get(key: string): Promise<unknown | undefined>;
  set(key: string, value: unknown, ttlMs: number): Promise<void>;
}

export interface FetchOptions {
  fetchFn?: typeof fetch;
  cache?: DataCache;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export class OpenDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenDataError';
  }
}

const DAY = 24 * 60 * 60 * 1000;

async function getJson(
  url: string,
  { fetchFn = fetch, timeoutMs = 10_000, signal }: FetchOptions,
): Promise<unknown> {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchFn(url, {
      signal: controller.signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    if (response.status === 429)
      throw new OpenDataError('El servicio recibió demasiadas consultas. Intenta en unos minutos.');
    if (!response.ok) throw new OpenDataError(`El servicio respondió con un error (${response.status}).`);
    return await response.json();
  } catch (error) {
    if (error instanceof OpenDataError) throw error;
    if (controller.signal.aborted && !signal?.aborted)
      throw new OpenDataError('El servicio tardó demasiado en responder.');
    throw new OpenDataError('No se pudo conectar con el servicio. Revisa tu conexión.');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

async function cachedJson<T>(
  key: string,
  url: string,
  parse: (json: unknown) => T,
  ttlMs: number,
  options: FetchOptions,
): Promise<T> {
  const hit = await options.cache?.get(key).catch(() => undefined);
  if (hit !== undefined) {
    try {
      return parse(hit);
    } catch {
      // A malformed cache entry is ignored and refreshed.
    }
  }
  const json = await getJson(url, options);
  const parsed = parse(json);
  await options.cache?.set(key, json, ttlMs).catch(() => undefined);
  return parsed;
}

// ---------------------------------------------------------------- World Bank

export interface Indicator {
  code: string;
  nombre: string;
  unidad: string;
  fuenteOriginal: string;
}

/** Curated indicators (Spanish names and original sources as published by the World Bank API, language "es"). */
export const INDICATORS: Indicator[] = [
  {
    code: 'NY.GDP.MKTP.KD.ZG',
    nombre: 'Crecimiento del PIB',
    unidad: '% anual',
    fuenteOriginal: 'Datos de cuentas nacionales del Banco Mundial y de la OCDE',
  },
  {
    code: 'NY.GDP.PCAP.CD',
    nombre: 'PIB per cápita',
    unidad: 'US$ a precios actuales',
    fuenteOriginal: 'Datos de cuentas nacionales del Banco Mundial y de la OCDE',
  },
  {
    code: 'FP.CPI.TOTL.ZG',
    nombre: 'Inflación, precios al consumidor',
    unidad: '% anual',
    fuenteOriginal: 'Fondo Monetario Internacional, Estadísticas Financieras Internacionales',
  },
  {
    code: 'SL.UEM.TOTL.ZS',
    nombre: 'Desempleo (estimación modelada de la OIT)',
    unidad: '% de la fuerza laboral',
    fuenteOriginal: 'Organización Internacional del Trabajo, ILOSTAT',
  },
  {
    code: 'NE.EXP.GNFS.ZS',
    nombre: 'Exportaciones de bienes y servicios',
    unidad: '% del PIB',
    fuenteOriginal: 'Datos de cuentas nacionales del Banco Mundial y de la OCDE',
  },
  {
    code: 'NE.IMP.GNFS.ZS',
    nombre: 'Importaciones de bienes y servicios',
    unidad: '% del PIB',
    fuenteOriginal: 'Datos de cuentas nacionales del Banco Mundial y de la OCDE',
  },
  {
    code: 'BX.TRF.PWKR.DT.GD.ZS',
    nombre: 'Remesas recibidas',
    unidad: '% del PIB',
    fuenteOriginal: 'Estimaciones del Banco Mundial con datos de balanza de pagos del FMI',
  },
];

export const COUNTRIES: { code: string; nombre: string }[] = [
  { code: 'ECU', nombre: 'Ecuador' },
  { code: 'COL', nombre: 'Colombia' },
  { code: 'PER', nombre: 'Perú' },
  { code: 'BOL', nombre: 'Bolivia' },
  { code: 'CHL', nombre: 'Chile' },
  { code: 'ARG', nombre: 'Argentina' },
  { code: 'BRA', nombre: 'Brasil' },
  { code: 'MEX', nombre: 'México' },
  { code: 'PAN', nombre: 'Panamá' },
  { code: 'USA', nombre: 'Estados Unidos' },
  { code: 'ESP', nombre: 'España' },
  { code: 'CHN', nombre: 'China' },
  { code: 'LCN', nombre: 'América Latina y el Caribe' },
];

const wbSchema = z.tuple([
  z.object({ page: z.number(), pages: z.number(), total: z.number(), lastupdated: z.string().optional() }),
  z
    .array(
      z.object({
        countryiso3code: z.string(),
        date: z.string(),
        value: z.number().nullable(),
      }),
    )
    .nullable(),
]);

export interface Series {
  country: string;
  points: { year: number; value: number }[];
}

export interface IndicatorData {
  indicator: Indicator;
  series: Series[];
  actualizado?: string;
}

export function worldBankUrl(code: string, countries: readonly string[], from: number, to: number): string {
  if (!INDICATORS.some((i) => i.code === code)) throw new OpenDataError('Indicador no disponible.');
  const valid = countries.filter((c) => COUNTRIES.some((k) => k.code === c));
  if (valid.length === 0) throw new OpenDataError('Elige al menos un país.');
  return `https://api.worldbank.org/v2/country/${valid.join(';')}/indicator/${code}?format=json&date=${from}:${to}&per_page=1000`;
}

export function parseWorldBank(
  json: unknown,
  indicator: Indicator,
  countries: readonly string[],
): IndicatorData {
  const [meta, rows] = wbSchema.parse(json);
  const series = countries.map((country) => ({
    country,
    points: (rows ?? [])
      .filter((r) => r.countryiso3code === country && r.value !== null && /^\d{4}$/.test(r.date))
      .map((r) => ({ year: Number(r.date), value: r.value as number }))
      .sort((a, b) => a.year - b.year),
  }));
  return { indicator, series, ...(meta.lastupdated ? { actualizado: meta.lastupdated } : {}) };
}

export async function fetchIndicator(
  code: string,
  countries: readonly string[],
  from: number,
  to: number,
  options: FetchOptions = {},
): Promise<IndicatorData> {
  const indicator = INDICATORS.find((i) => i.code === code);
  if (!indicator) throw new OpenDataError('Indicador no disponible.');
  const sorted = [...countries].sort();
  const url = worldBankUrl(code, sorted, from, to);
  return cachedJson(
    `wb:${code}:${sorted.join(',')}:${from}:${to}`,
    url,
    (json) => parseWorldBank(json, indicator, sorted),
    DAY,
    options,
  );
}

// ---------------------------------------------------------------- Frankfurter (ECB reference rates)

/** Currencies with ECB reference rates (checked with providers=ECB on 2026-10-25). */
export const ECB_CURRENCIES: { code: string; nombre: string }[] = [
  { code: 'EUR', nombre: 'Euro' },
  { code: 'CNY', nombre: 'Yuan chino' },
  { code: 'MXN', nombre: 'Peso mexicano' },
  { code: 'BRL', nombre: 'Real brasileño' },
  { code: 'GBP', nombre: 'Libra esterlina' },
  { code: 'JPY', nombre: 'Yen japonés' },
  { code: 'CAD', nombre: 'Dólar canadiense' },
  { code: 'CHF', nombre: 'Franco suizo' },
  { code: 'KRW', nombre: 'Won surcoreano' },
  { code: 'INR', nombre: 'Rupia india' },
  { code: 'AUD', nombre: 'Dólar australiano' },
  { code: 'TRY', nombre: 'Lira turca' },
  { code: 'ZAR', nombre: 'Rand sudafricano' },
  { code: 'SEK', nombre: 'Corona sueca' },
  { code: 'NOK', nombre: 'Corona noruega' },
  { code: 'DKK', nombre: 'Corona danesa' },
  { code: 'PLN', nombre: 'Esloti polaco' },
  { code: 'CZK', nombre: 'Corona checa' },
  { code: 'HUF', nombre: 'Forinto húngaro' },
  { code: 'RON', nombre: 'Leu rumano' },
  { code: 'ILS', nombre: 'Séquel israelí' },
  { code: 'SGD', nombre: 'Dólar de Singapur' },
  { code: 'HKD', nombre: 'Dólar de Hong Kong' },
  { code: 'NZD', nombre: 'Dólar neozelandés' },
  { code: 'THB', nombre: 'Baht tailandés' },
  { code: 'IDR', nombre: 'Rupia indonesia' },
  { code: 'MYR', nombre: 'Ringgit malayo' },
  { code: 'PHP', nombre: 'Peso filipino' },
  { code: 'ISK', nombre: 'Corona islandesa' },
];

const fxSchema = z.array(
  z.object({ date: z.string(), base: z.string(), quote: z.string(), rate: z.number().positive() }),
);

export interface FxRate {
  date: string;
  quote: string;
  rate: number;
}

const isEcbCurrency = (code: string): boolean => ECB_CURRENCIES.some((c) => c.code === code);
const isoDate = /^\d{4}-\d{2}-\d{2}$/;

/** Latest USD rates (units of each currency per 1 USD), computed by Frankfurter from ECB reference rates. */
export async function fetchLatestUsd(
  quotes: readonly string[],
  options: FetchOptions = {},
): Promise<FxRate[]> {
  const valid = quotes.filter(isEcbCurrency);
  if (valid.length === 0) throw new OpenDataError('Elige al menos una moneda.');
  const url = `https://api.frankfurter.dev/v2/rates?providers=ECB&base=USD&quotes=${valid.join(',')}`;
  return cachedJson(
    `fx:latest:${[...valid].sort().join(',')}`,
    url,
    (json) => fxSchema.parse(json).map(({ date, quote, rate }) => ({ date, quote, rate })),
    6 * 60 * 60 * 1000,
    options,
  );
}

/** Daily USD series of one currency between two dates. */
export async function fetchUsdSeries(
  quote: string,
  from: string,
  to: string,
  options: FetchOptions = {},
): Promise<FxRate[]> {
  if (!isEcbCurrency(quote))
    throw new OpenDataError('Moneda no disponible en los tipos de referencia del BCE.');
  if (!isoDate.test(from) || !isoDate.test(to) || from > to) throw new OpenDataError('Revisa las fechas.');
  const url = `https://api.frankfurter.dev/v2/rates?providers=ECB&base=USD&quotes=${quote}&from=${from}&to=${to}`;
  return cachedJson(
    `fx:series:${quote}:${from}:${to}`,
    url,
    (json) => fxSchema.parse(json).map(({ date, quote: q, rate }) => ({ date, quote: q, rate })),
    DAY,
    options,
  );
}

export function convert(amountUsd: number, rate: number): number {
  if (!Number.isFinite(amountUsd) || amountUsd < 0)
    throw new OpenDataError('El monto debe ser un número positivo.');
  return amountUsd * rate;
}

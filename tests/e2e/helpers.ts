import type { Page, Route } from '@playwright/test';
import { crossrefFixture, doajFixture, laReferenciaFixture, openAlexFixture, openLibraryFixture } from '../fixtures/academic';

export const ACADEMIC_HOSTS = ['api.crossref.org', 'api.openalex.org', 'doaj.org', 'buscador.lareferencia.info', 'openlibrary.org'];
export const DATA_HOSTS = ['api.worldbank.org', 'api.frankfurter.dev'];
/** Every third-party host the app may contact (csp.config.ts). Anything else is a privacy failure. */
export const ALLOWED_HOSTS = [...ACADEMIC_HOSTS, ...DATA_HOSTS];

/** Opens a hash route and accepts the first-visit notice if it appears. */
export async function open(page: Page, route = '/'): Promise<void> {
  await page.goto(`/#${route}`);
  await dismissOnboarding(page);
}

export async function dismissOnboarding(page: Page): Promise<void> {
  const button = page.getByRole('button', { name: 'Entendido, empezar' });
  try {
    await button.waitFor({ state: 'visible', timeout: 4000 });
    await button.click();
    await button.waitFor({ state: 'hidden' });
  } catch {
    // Already accepted in this context.
  }
}

const json = (body: unknown) => ({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) });

/** Serves fictitious academic answers so tests never depend on third-party uptime. */
export async function mockAcademicApis(page: Page, overrides: Partial<Record<string, (route: Route) => Promise<void>>> = {}): Promise<void> {
  const defaults: Record<string, (route: Route) => Promise<void>> = {
    'api.crossref.org': (route) => route.fulfill(json(crossrefFixture)),
    'api.openalex.org': (route) => route.fulfill(json(openAlexFixture)),
    'doaj.org': (route) => route.fulfill(json(doajFixture)),
    'buscador.lareferencia.info': (route) => route.fulfill(json(laReferenciaFixture)),
    'openlibrary.org': (route) => route.fulfill(json(openLibraryFixture)),
  };
  for (const host of ACADEMIC_HOSTS) {
    const handler = overrides[host] ?? defaults[host];
    if (handler) await page.route(`https://${host}/**`, handler);
  }
}

/** Fictitious World Bank and Frankfurter answers with the real response shapes. */
export async function mockDataApis(page: Page): Promise<void> {
  await page.route('https://api.worldbank.org/**', (route) => {
    const country = new URL(route.request().url()).pathname.split('/')[3] ?? 'ECU';
    const rows = country.split(';').flatMap((c) => [
      { countryiso3code: c, date: '2023', value: 2.2 },
      { countryiso3code: c, date: '2024', value: 1.5 },
    ]);
    return route.fulfill(json([{ page: 1, pages: 1, total: rows.length, lastupdated: '2026-10-08' }, rows]));
  });
  await page.route('https://api.frankfurter.dev/**', (route) =>
    route.fulfill(json([{ date: '2026-10-23', base: 'USD', quote: 'EUR', rate: 0.89342 }])),
  );
}

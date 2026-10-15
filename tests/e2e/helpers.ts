import type { Page, Route } from '@playwright/test';
import { crossrefFixture, doajFixture, laReferenciaFixture, openAlexFixture } from '../fixtures/academic';

export const ACADEMIC_HOSTS = ['api.crossref.org', 'api.openalex.org', 'doaj.org', 'buscador.lareferencia.info'];

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
  };
  for (const host of ACADEMIC_HOSTS) {
    const handler = overrides[host] ?? defaults[host];
    if (handler) await page.route(`https://${host}/**`, handler);
  }
}

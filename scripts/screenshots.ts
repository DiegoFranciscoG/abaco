/**
 * Screenshots for the README (docs/img). Needs the production build served by `npm run preview` on port 4173.
 * Run: `npm run build && npm run preview` in one terminal and `node scripts/screenshots.ts` in another.
 */
import { chromium, devices, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.SCREENSHOT_URL ?? 'http://127.0.0.1:4173';
const out = join(import.meta.dirname, '..', 'docs', 'img');
mkdirSync(out, { recursive: true });

async function open(page: Page, route: string) {
  await page.goto(`${BASE}/#${route}`);
  const ok = page.getByRole('button', { name: 'Entendido, empezar' });
  const shown = await ok
    .waitFor({ state: 'visible', timeout: 4000 })
    .then(() => true)
    .catch(() => false);
  if (shown) await ok.click();
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
}

const browser = await chromium.launch();
const desktop = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  locale: 'es-EC',
  colorScheme: 'light',
  reducedMotion: 'reduce',
});
const page = await desktop.newPage();
await open(page, '/');
await page.screenshot({ path: join(out, 'portada.png') });
await open(page, '/materias?carrera=contabilidad-auditoria&ciclo=2');
await page.getByRole('heading', { name: 'Por carrera y ciclo' }).scrollIntoViewIfNeeded();
await page.screenshot({ path: join(out, 'carrera-ciclo.png') });
await open(page, '/materia/contabilidad-general/tema/cg-ecuacion?s=cg-ecuacion-elementos');
await page.screenshot({ path: join(out, 'subtema.png') });
await open(page, '/herramientas/rol-pagos');
await page.screenshot({ path: join(out, 'rol-de-pagos.png') });
await open(page, '/sugerencias');
await page.screenshot({ path: join(out, 'buzon.png') });
await open(page, '/estudiar?materia=contabilidad-costos');
await page.getByRole('tab', { name: 'Examen' }).click();
await page.getByRole('button', { name: /Empezar examen/ }).click();
await page.getByRole('group', { name: 'Pregunta 1', exact: true }).scrollIntoViewIfNeeded();
await page.screenshot({ path: join(out, 'area-estudio.png') });

const phone = await browser.newContext({
  ...devices['Pixel 7'],
  locale: 'es-EC',
  colorScheme: 'dark',
  reducedMotion: 'reduce',
});
const mobile = await phone.newPage();
await open(mobile, '/materias?carrera=economia&ciclo=3');
await mobile.getByRole('heading', { name: 'Por carrera y ciclo' }).scrollIntoViewIfNeeded();
await mobile.screenshot({ path: join(out, 'movil-oscuro.png') });
await browser.close();
console.log(`Capturas en ${out}`);

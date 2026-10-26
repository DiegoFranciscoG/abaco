import { expect, test } from '@playwright/test';
import { open } from './helpers';

/**
 * T-08: after one visit with connection, the app keeps working without internet thanks to the service
 * worker precache: subjects by career and cycle, notes, the lab and the tools work; the academic search and the
 * open-data tools explain they are offline.
 */
test('T-08: la app funciona sin internet', async ({ page, context }) => {
  await open(page, '/');
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.active?.state;
  });
  // The service worker controls the page after a reload.
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), { timeout: 20_000 }).toBe(true);

  await context.setOffline(true);

  await page.goto('/#/materias?carrera=economia&ciclo=3');
  await expect(page.getByRole('region', { name: '3.º ciclo' }).getByRole('link', { name: /^Macroeconomía/ })).toBeVisible();
  await expect(page.getByText(/Sin conexión/).first()).toBeVisible();

  await open(page, '/herramientas/rol-pagos');
  await page.getByLabel(/Sueldo mensual/).fill('1000');
  await expect(page.getByText(/905,50/).first()).toBeVisible();

  await open(page, '/materia/calculo-diferencial');
  await page.getByLabel('Contenido del apunte').fill('Apunte escrito sin internet');
  await page.getByRole('button', { name: 'Guardar apunte' }).click();
  await expect(page.getByText('Apunte escrito sin internet')).toBeVisible();

  await open(page, '/laboratorio/nueva?plantilla=depreciacion');
  await expect(page.getByText('Comprobación de la plantilla')).toBeVisible();

  await open(page, '/buscar');
  await expect(page.getByText(/Estás sin conexión/)).toBeVisible();
  await page.getByLabel('Tema a buscar').fill('costos');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Estado de cada fuente' })).toContainText('Sin conexión');

  await context.setOffline(false);
});

import { expect, test } from '@playwright/test';
import { open } from './helpers';

/**
 * T-08: after one visit with connection, the app keeps working without internet thanks to the service
 * worker precache: curricula, notes and the lab work; the academic search explains it is offline.
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

  await page.goto('/#/carrera/ucuenca-economia');
  await expect(page.getByRole('heading', { name: 'Economía' })).toBeVisible();
  await expect(page.getByText(/Sin conexión/).first()).toBeVisible();

  await open(page, '/asignatura/ucuenca-contabilidad-auditoria--c1-calculo-diferencial');
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

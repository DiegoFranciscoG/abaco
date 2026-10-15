import { expect, test, type Request } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { ACADEMIC_HOSTS, mockAcademicApis, open } from './helpers';

const NOTE_TEXT = 'Apunte secreto de prueba 7f3a: el VAN descuenta desde t = 1';
const COLLECTION_NAME = 'Coleccion privada 9c1e';

/** T-03: two students on the same URL never see each other's data (separate browser contexts). */
test('T-03: aislamiento entre estudiantes con el mismo enlace', async ({ browser }) => {
  const studentA = await browser.newContext();
  const studentB = await browser.newContext();
  const pageA = await studentA.newPage();
  const pageB = await studentB.newPage();
  const subject = '/asignatura/ucuenca-contabilidad-auditoria--c1-contabilidad-general';

  await open(pageA, subject);
  await pageA.getByLabel('Contenido del apunte').fill(NOTE_TEXT);
  await pageA.getByRole('button', { name: 'Guardar apunte' }).click();
  await expect(pageA.getByText(NOTE_TEXT)).toBeVisible();

  await open(pageB, subject);
  await expect(pageB.getByText('Aún no tienes apuntes aquí')).toBeVisible();
  await expect(pageB.getByText(NOTE_TEXT)).toHaveCount(0);
  await open(pageB, '/mi-espacio');
  await expect(pageB.getByText(NOTE_TEXT)).toHaveCount(0);

  await pageA.reload();
  await expect(pageA.getByText(NOTE_TEXT)).toBeVisible();
  await studentA.close();
  await studentB.close();
});

/**
 * T-04: every network request of a complete session is recorded. Only same-origin static files and the
 * academic APIs may appear, and none may carry a note, a collection name or the local identifier.
 */
test('T-04: nada personal sale del dispositivo', async ({ page }) => {
  const requests: Request[] = [];
  page.on('request', (r) => requests.push(r));
  await mockAcademicApis(page);

  await open(page, '/asignatura/ucuenca-contabilidad-auditoria--c1-contabilidad-general');
  await page.getByLabel('Contenido del apunte').fill(NOTE_TEXT);
  await page.getByRole('button', { name: 'Guardar apunte' }).click();
  await expect(page.getByText(NOTE_TEXT)).toBeVisible();

  await open(page, '/mi-espacio?tab=colecciones');
  await page.getByPlaceholder(/Examen de Costos/).fill(COLLECTION_NAME);
  await page.getByRole('button', { name: 'Crear' }).click();
  await expect(page.getByText(COLLECTION_NAME)).toBeVisible();

  await open(page, '/formulas/van');
  await page.getByRole('button', { name: /Marcar con estrella/ }).click();
  await open(page, '/laboratorio/nueva?plantilla=libro-diario');
  await expect(page.getByText('Guardado en este dispositivo')).toBeVisible();

  await open(page, '/buscar');
  await page.getByLabel('Tema a buscar').fill('control interno');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page.getByText('Copiar cita').first()).toBeVisible();

  await open(page, '/ajustes');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar respaldo' }).click();
  const file = await download;
  const backup = JSON.parse(readFileSync((await file.path()) as string, 'utf8')) as { dispositivo: string };
  const deviceId = backup.dispositivo;
  expect(deviceId).toMatch(/^[0-9a-f-]{36}$/);

  const origin = new URL(page.url()).origin;
  const offenders: string[] = [];
  for (const request of requests) {
    const url = new URL(request.url());
    const payload = `${request.url()} ${request.postData() ?? ''} ${JSON.stringify(request.headers())}`;
    const allowed = url.origin === origin || ACADEMIC_HOSTS.includes(url.host) || url.protocol === 'data:' || url.protocol === 'blob:';
    if (!allowed) offenders.push(`origen no permitido: ${url.origin}`);
    for (const secret of [NOTE_TEXT, 'Apunte secreto', COLLECTION_NAME, deviceId, deviceId.slice(0, 8)]) {
      if (payload.includes(secret) || payload.includes(encodeURIComponent(secret))) offenders.push(`${secret} en ${url.host}`);
    }
  }
  expect(offenders).toEqual([]);
  const external = requests.filter((r) => ACADEMIC_HOSTS.includes(new URL(r.url()).host));
  expect(external.length).toBeGreaterThan(0);
  for (const r of external) {
    expect(r.method()).toBe('GET');
    expect(decodeURIComponent(r.url())).toContain('control interno');
  }
});

/** T-09: a source that is down, failing or too slow never blocks the others, and deep links are offered. */
test('T-09: fuentes caídas o lentas no rompen el buscador', async ({ page }) => {
  await mockAcademicApis(page, {
    'api.crossref.org': (route) => route.abort('failed'),
    'api.openalex.org': (route) => route.abort('timedout'),
    'doaj.org': (route) => route.fulfill({ status: 500, body: 'error', headers: { 'Access-Control-Allow-Origin': '*' } }),
  });
  await open(page, '/buscar');
  await page.getByLabel('Tema a buscar').fill('niif pymes');
  const started = Date.now();
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Aplicación de la NIIF para las PYMES en comercios de Cuenca' })).toBeVisible();
  expect(Date.now() - started).toBeLessThan(10_000);
  const status = page.getByRole('list', { name: 'Estado de cada fuente' });
  await expect(status).toContainText('Crossref');
  await expect(status).toContainText('DOAJ');
  await expect(page.getByRole('link', { name: /Google Académico/ })).toHaveAttribute('href', /scholar\.google\.com\/scholar\?hl=es&q=niif%20pymes/);
  await expect(page.getByRole('link', { name: /Scribd/ })).toHaveAttribute('href', /scribd\.com\/search\?query=niif%20pymes/);
});

/** T-06 through the interface: download a backup, wipe everything, restore it. */
test('T-06: respaldo, borrado y restauración desde Ajustes', async ({ page }) => {
  await open(page, '/asignatura/ucuenca-contabilidad-auditoria--c1-estadistica-descriptiva');
  await page.getByLabel('Contenido del apunte').fill('Media: sensible a extremos');
  await page.getByRole('button', { name: 'Guardar apunte' }).click();

  await open(page, '/ajustes');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar respaldo' }).click();
  const backupPath = (await (await download).path()) as string;

  await page.getByLabel('Escribe BORRAR para confirmar').fill('BORRAR');
  await page.getByRole('button', { name: 'Borrar todo' }).click();
  await open(page, '/mi-espacio');
  await expect(page.getByText('Media: sensible a extremos')).toHaveCount(0);

  await open(page, '/ajustes');
  await page.locator('input[type=file][accept*="json"]').setInputFiles(backupPath);
  await page.getByRole('button', { name: 'Restaurar', exact: true }).click();
  await open(page, '/mi-espacio');
  await expect(page.getByText('Media: sensible a extremos')).toBeVisible();
});
